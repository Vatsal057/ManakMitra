"""Embedding text construction, encoder, and on-disk embedding cache.

Whole-corpus versioned cache: 287 rows encode in well under a second, so a
partial re-embed (diffing changed rows, splicing vectors) would add real
complexity for a negligible saving. Any corpus change invalidates the
whole cache and re-encodes everything.
"""
from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CACHE_PATH = ROOT / "data" / "cache" / "embeddings.npy"
MODEL_NAME = "all-MiniLM-L6-v2"


def compose_text(title: str, category: str, scope_description: str) -> str:
    """Exact template per spec -- title carries the product noun, scope
    carries what distinguishes similar standards, category adds domain
    signal. No padding/special-casing when scope_description is empty."""
    title = title or ""
    category = category or ""
    scope_description = scope_description or ""
    return f"{title}. Category: {category}. {scope_description}"


@lru_cache(maxsize=1)
def load_encoder():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(MODEL_NAME)


def _meta_path(cache_path: Path) -> Path:
    return cache_path.with_suffix(".meta.json")


def _corpus_hash(composed_texts: list[str]) -> str:
    return hashlib.sha256("\n".join(composed_texts).encode("utf-8")).hexdigest()


def _l2_normalize(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


def embed_corpus(df: pd.DataFrame, cache_path: Path = DEFAULT_CACHE_PATH) -> np.ndarray:
    """Returns an (n_rows, 384) L2-normalized float32 matrix, row order ==
    df row order. Reads/writes the on-disk cache internally."""
    composed = list(df["composed_text"])
    row_ids = list(df["standard_number"])
    current_hash = _corpus_hash(composed)

    meta_path = _meta_path(cache_path)
    if cache_path.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        if meta.get("corpus_hash") == current_hash and meta.get("row_ids") == row_ids:
            return np.load(cache_path)

    encoder = load_encoder()
    vectors = encoder.encode(composed, convert_to_numpy=True, show_progress_bar=False)
    vectors = _l2_normalize(vectors.astype(np.float32))

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    np.save(cache_path, vectors)
    meta_path.write_text(json.dumps({
        "corpus_hash": current_hash,
        "row_ids": row_ids,
        "n_rows": len(row_ids),
        "model": MODEL_NAME,
    }, indent=2), encoding="utf-8")

    return vectors


def embed_query(text: str) -> np.ndarray:
    """Single-vector encode + L2-normalize. Not cached -- queries aren't reused."""
    encoder = load_encoder()
    vector = encoder.encode([text], convert_to_numpy=True, show_progress_bar=False)
    return _l2_normalize(vector.astype(np.float32))[0]
