"""Embedding backends for the Indian Standards retrieval pipeline.

Three backends, tried in this order by :func:`get_backend`:

1. ``sentence-transformers`` (all-MiniLM-L6-v2) — real semantic embeddings.
2. ``scikit-learn`` TF-IDF + SVD — lexical with some latent semantics.
3. Pure-numpy hashing vectorizer — always available, no third-party ML deps.

Every backend exposes the same tiny contract::

    backend.fit(corpus)            # learn vocabulary/idf; no-op for neural models
    vecs = backend.encode(texts)   # -> float32 ndarray, L2-normalised rows

Because rows are L2-normalised, cosine similarity is a plain dot product.
"""

from __future__ import annotations

import hashlib
import logging
import math
import re
from collections import Counter
from typing import List, Sequence

import numpy as np

logger = logging.getLogger(__name__)

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> List[str]:
    """Lowercase word tokenizer shared by the lexical backends and the reranker."""
    return _TOKEN_RE.findall(text.lower())


def _l2_normalize(matrix: np.ndarray) -> np.ndarray:
    matrix = np.asarray(matrix, dtype=np.float32)
    if matrix.ndim == 1:
        matrix = matrix.reshape(1, -1)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0.0] = 1.0
    return matrix / norms


class EmbeddingBackend:
    """Base class. Subclasses set ``name`` and implement ``_encode``."""

    name = "base"
    is_semantic = False

    def fit(self, corpus: Sequence[str]) -> "EmbeddingBackend":  # pragma: no cover
        return self

    def encode(self, texts: Sequence[str]) -> np.ndarray:
        if isinstance(texts, str):
            texts = [texts]
        if not texts:
            return np.zeros((0, 1), dtype=np.float32)
        return _l2_normalize(self._encode(list(texts)))

    def _encode(self, texts: List[str]) -> np.ndarray:  # pragma: no cover
        raise NotImplementedError


class SentenceTransformerBackend(EmbeddingBackend):
    """Sentence-BERT embeddings. Preferred backend when torch is installable."""

    is_semantic = True

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer  # noqa: PLC0415

        self.model_name = model_name
        self.name = f"sentence-transformers:{model_name.split('/')[-1]}"
        self.model = SentenceTransformer(model_name)

    def _encode(self, texts: List[str]) -> np.ndarray:
        return self.model.encode(
            texts,
            batch_size=32,
            convert_to_numpy=True,
            show_progress_bar=False,
        )


class TfidfSvdBackend(EmbeddingBackend):
    """TF-IDF over word + character n-grams, optionally reduced with SVD.

    Character n-grams matter here: procurement text is full of near-misses like
    "reinforcement bar" vs "reinforcing bars", and standard numbers such as
    "IS 1786".
    """

    def __init__(self, n_components: int = 256):
        from sklearn.decomposition import TruncatedSVD  # noqa: PLC0415
        from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: PLC0415
        from sklearn.pipeline import FeatureUnion  # noqa: PLC0415

        self.name = "tfidf-svd"
        self._svd_cls = TruncatedSVD
        self._n_components = n_components
        self.vectorizer = FeatureUnion(
            [
                (
                    "word",
                    TfidfVectorizer(
                        analyzer="word",
                        ngram_range=(1, 2),
                        sublinear_tf=True,
                        min_df=1,
                        stop_words="english",
                    ),
                ),
                (
                    "char",
                    TfidfVectorizer(
                        analyzer="char_wb",
                        ngram_range=(4, 5),
                        sublinear_tf=True,
                        min_df=2,
                    ),
                ),
            ]
        )
        self.svd = None

    def fit(self, corpus: Sequence[str]) -> "TfidfSvdBackend":
        matrix = self.vectorizer.fit_transform(list(corpus))
        n_components = min(self._n_components, max(2, min(matrix.shape) - 1))
        if matrix.shape[0] > n_components + 1:
            self.svd = self._svd_cls(n_components=n_components, random_state=42)
            self.svd.fit(matrix)
            self.name = f"tfidf-svd:{n_components}d"
        else:
            # Too few documents for a meaningful decomposition — keep raw TF-IDF.
            self.svd = None
            self.name = f"tfidf:{matrix.shape[1]}d"
        return self

    def _encode(self, texts: List[str]) -> np.ndarray:
        matrix = self.vectorizer.transform(texts)
        if self.svd is not None:
            return self.svd.transform(matrix)
        return np.asarray(matrix.todense())


class HashingBackend(EmbeddingBackend):
    """Dependency-free fallback: hashed word/bigram/char-gram features with idf.

    Not semantic, but it keeps the whole pipeline, the CLI and the Task 4 API
    runnable on any Python install. Ranking quality is clearly worse, so the
    pipeline labels results produced by this backend as ``lexical``.
    """

    def __init__(self, dim: int = 4096):
        self.name = f"hashing:{dim}d"
        self.dim = dim
        self.idf: dict[str, float] = {}
        self.default_idf = 1.0

    @staticmethod
    def _features(text: str) -> Counter:
        tokens = tokenize(text)
        feats = Counter(tokens)
        feats.update(f"{a}_{b}" for a, b in zip(tokens, tokens[1:]))
        padded = f" {' '.join(tokens)} "
        feats.update(padded[i : i + 4] for i in range(max(0, len(padded) - 3)))
        return feats

    def _bucket(self, feature: str) -> int:
        digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
        return int.from_bytes(digest, "big") % self.dim

    def fit(self, corpus: Sequence[str]) -> "HashingBackend":
        corpus = list(corpus)
        n_docs = max(1, len(corpus))
        doc_freq: Counter = Counter()
        for text in corpus:
            doc_freq.update(self._features(text).keys())
        self.idf = {
            feat: math.log((n_docs + 1) / (df + 1)) + 1.0 for feat, df in doc_freq.items()
        }
        self.default_idf = math.log(n_docs + 1) + 1.0
        return self

    def _encode(self, texts: List[str]) -> np.ndarray:
        out = np.zeros((len(texts), self.dim), dtype=np.float32)
        for row, text in enumerate(texts):
            for feat, count in self._features(text).items():
                weight = (1.0 + math.log(count)) * self.idf.get(feat, self.default_idf)
                out[row, self._bucket(feat)] += weight
        return out


def get_backend(prefer: str = "auto") -> EmbeddingBackend:
    """Return the best available backend.

    ``prefer`` accepts ``auto`` (default), ``sentence-transformers``, ``tfidf``
    or ``hashing``. Anything other than ``auto`` is treated as a hard request
    and raises if the dependency is missing.
    """
    prefer = (prefer or "auto").lower()
    strict = prefer != "auto"

    if prefer in {"auto", "sentence-transformers", "st", "minilm"}:
        try:
            return SentenceTransformerBackend()
        except Exception as exc:  # ImportError, model download failure, ...
            if strict:
                raise
            logger.warning("sentence-transformers unavailable (%s); trying TF-IDF.", exc)

    if prefer in {"auto", "tfidf", "sklearn"}:
        try:
            return TfidfSvdBackend()
        except Exception as exc:
            if strict:
                raise
            logger.warning("scikit-learn unavailable (%s); falling back to hashing.", exc)

    if prefer in {"auto", "hashing", "hash"}:
        return HashingBackend()

    raise ValueError(f"Unknown embedding backend: {prefer!r}")
