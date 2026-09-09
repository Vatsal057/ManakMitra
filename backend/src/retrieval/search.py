"""Hybrid retrieval: exact identifier + dense cosine + BM25, fused with RRF.

RetrievalIndex.build() is the single place that assembles everything (load
CSV, compose text, embed, build BM25) -- scripts/build_index.py,
scripts/evaluate.py, and src/api/main.py all call into this rather than
re-deriving the assembly logic.
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from rank_bm25 import BM25Okapi

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from retrieval.embed import compose_text, embed_corpus, embed_query, DEFAULT_CACHE_PATH
from retrieval.identifiers import extract_identifier, resolve_identifier

DEFAULT_CSV_PATH = ROOT / "data" / "bis_standards_clean.csv"
DEFAULT_ALLIED_PATH = ROOT / "data" / "allied_standards_mapping_normalized.json"

RRF_K = 60

# Raw `relationship` value on disk -> wire `relationship_type` bucket.
# "terminology" never appears in the source data but must always be a
# present (empty) key in the response, since the frontend type expects it.
_RELATIONSHIP_GROUPS = ["test_method", "safety", "terminology", "installation", "normative_reference"]
_RELATIONSHIP_REMAP = {
    "test_method": "test_method",
    "safety": "safety",
    "installation_application": "installation",
    "normative_reference": "normative_reference",
}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", (text or "").lower())


def _nullable(value):
    """Treat pandas NaN / empty string as None -- never invent a value."""
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    if isinstance(value, str) and value.strip() == "":
        return None
    return value


def _nullable_int(value) -> Optional[int]:
    value = _nullable(value)
    return int(float(value)) if value is not None else None


def _nullable_bool(value) -> Optional[bool]:
    """Tri-state: True only on the literal string 'True'; everything else
    (empty/NaN) is None -- never defaulted to False."""
    value = _nullable(value)
    if value is None:
        return None
    return str(value).strip().lower() == "true"


def _load_corpus(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False, na_values=[""])
    # is_number/part are join keys used for equality comparisons elsewhere
    # (identifier resolution, allied lookups) -- give them real int/str-or-None
    # types now rather than leaving them as raw strings/NaN floats, which
    # would silently break those comparisons (NaN is truthy in Python).
    df["is_number"] = [_nullable_int(v) for v in df["is_number"]]
    df["part"] = [_nullable(v) for v in df["part"]]
    df["composed_text"] = [
        compose_text(row.title, row.category, row.scope_description)
        for row in df.itertuples()
    ]
    return df.reset_index(drop=True)


@dataclass
class SearchResult:
    row_index: int
    fused_score: float   # RRF (or raw BM25/cosine for the eval-only single-path
                          # variants) -- ranking/debugging only. NEVER shown to a
                          # user as confidence: RRF's rank-1 contribution is
                          # identical whether the match is perfect or nonsense
                          # (see data/eval/RESULTS.md's finding on this).
    dense_score: float   # raw cosine similarity for this row -- the honest
                          # confidence signal, surfaced as `similarity_score`.
    match_type: str       # "exact_identifier" | "hybrid"
    # How THIS result was actually ranked: "exact_identifier" for the pinned
    # citation match, "hybrid" when BM25 showed lexical signal and RRF fused
    # it with dense, "dense_only" when BM25 had none and dense ranked alone
    # (see BM25_SIGNAL_THRESHOLD). Surfaced on the wire response so a client
    # can tell which method actually produced a given ranking.
    retrieval_mode: str = "hybrid"


# --- ABSTENTION_THRESHOLD: PROVISIONAL, not a clean-gap calibration ---
#
# First calibrated against data/eval/queries.jsonl alone (n=5 no-answer):
# no-answer max dense similarity 0.244-0.427 vs genuine-match min 0.495-0.820
# (excluding exact-identifier queries -- see below). That gave a clean
# 0.068-wide gap and this threshold sits at its midpoint.
#
# Re-verified against the ENLARGED adversarial set (queries.jsonl's 5
# no-answer queries + queries_paraphrase.jsonl's 9 no-answer queries = 14)
# together with the paraphrase set's 31 genuine descriptive queries, which
# deliberately share no content vocabulary with their target's indexed
# text. Result: THE GAP IS GONE. No-answer max dense similarity is 0.427;
# genuine-match min dense similarity is 0.218 -- a 0.209-wide OVERLAP, not
# a gap. At this threshold, on that combined set: 0/14 no-answer queries
# are wrongly accepted (no false accepts), but 25/72 genuine queries
# (~35%, all from the paraphrase set) are wrongly abstained on (false
# abstains) -- see data/eval/RESULTS.md for the full breakdown.
#
# Per the decision rule this was built under: the threshold is NOT
# adjusted to hide this overlap, and no new "clean" threshold is invented
# by fitting to this data either -- there isn't one to find (the false-
# abstain count only worsens if the threshold is lowered enough to fix a
# handful of the borderline cases, and worsens the false-accept count if
# raised). This value is kept and marked PROVISIONAL: safe against false
# accepts (never told a real no-answer looks confident), costly in false
# abstains on genuine paraphrase-style queries. A real fix needs a better
# confidence signal than a single global cosine threshold -- e.g. a
# learned classifier over multiple features, or a per-category threshold
# -- not a retuned constant.
ABSTENTION_THRESHOLD = 0.461
ABSTENTION_THRESHOLD_STATUS = "provisional"

# --- LOW_CONFIDENCE_BOUNDARY: graded bands, not a binary gate ---
#
# Replaces binary abstention (which produced 25/72, ~35%, false abstains on
# genuine paraphrase-style queries) with three bands:
#   high     >= ABSTENTION_THRESHOLD (0.461)          -- normal results
#   moderate  LOW_CONFIDENCE_BOUNDARY < x < 0.461      -- shown, marked lower confidence
#   low      <= LOW_CONFIDENCE_BOUNDARY                -- near-misses only, `abstained=True`
#
# Decision rule this was built under: calibrate the low boundary from the
# no-answer distribution such that nothing genuine scores below it. That
# premise does NOT hold here -- checked, not assumed. Combined no-answer
# scores (n=14, both query sets) and genuine-query scores (n=72) are fully
# INTERLEAVED between ~0.21 and ~0.45: the genuine-query minimum (0.2179)
# is only marginally above the no-answer minimum (0.2108), and no-answer
# queries appear throughout the range up to their maximum. There is no
# value that cleanly separates them -- per the fallback decision rule,
# LOW_CONFIDENCE_BOUNDARY is set to the no-answer MAXIMUM and marked
# provisional, exactly as ABSTENTION_THRESHOLD already is.
#
# Measured effect (see data/eval/RESULTS.md for the full table): false
# accepts stay at 0/14 (no no-answer query ever lands outside `low`).
# False abstains drop from 25/72 to 21/72 -- 4 queries rescued into
# `moderate` -- a real but modest improvement, not a fix. Reported exactly
# as measured, not rounded up.
LOW_CONFIDENCE_BOUNDARY = 0.4273


# --- BM25_SIGNAL_THRESHOLD: conditional fusion ---
#
# On the paraphrase set, unconditional RRF hybrid scores 0.226 recall@1
# while dense alone scores 0.484 -- RRF gives BM25's ranking equal weight
# in the fusion sum even when BM25 is failing (0.129 recall@1 there), which
# drags a good dense ranking down. Fusion is now conditional on BM25
# actually showing lexical signal, not unconditional (never "fixed" by
# retuning RRF_K -- that was never the defect).
#
# Calibrated against both query sets' genuine (non-exact-identifier)
# queries' top-1 BM25 score:
#   frozen (vocabulary-matched) set (n=41): 11.4 - 53.3
#   paraphrase set (n=31):                   2.5 - 16.2
# NOT a perfectly clean separation (frozen's minimum, 11.4, sits inside the
# paraphrase set's range) -- but 17.0 is the value where zero paraphrase
# queries leak into `hybrid` mode, at the cost of 2/41 (5%) frozen queries
# ("chemical superplasticizer admixture...", "table margarine for
# institutional catering...") routing to `dense_only` instead of `hybrid`.
# Those two aren't a correctness failure -- dense alone still ranks them
# fine -- just not the (marginally stronger for vocabulary-matched
# queries) hybrid path. Re-derive by re-running scripts/evaluate.py if
# either query set changes.
BM25_SIGNAL_THRESHOLD = 17.0


class RetrievalIndex:
    def __init__(self, df: pd.DataFrame, embeddings: np.ndarray, allied_data: list[dict], build_seconds: float = 0.0):
        self.df = df
        self.embeddings = embeddings
        self.allied_data = allied_data
        self.build_seconds = build_seconds
        self.bm25 = BM25Okapi([_tokenize(t) for t in df["composed_text"]])

    @classmethod
    def build(cls, csv_path: Path = DEFAULT_CSV_PATH, allied_path: Path = DEFAULT_ALLIED_PATH,
              cache_path: Path = DEFAULT_CACHE_PATH) -> "RetrievalIndex":
        import time
        t0 = time.monotonic()
        df = _load_corpus(csv_path)
        embeddings = embed_corpus(df, cache_path)
        allied_data = json.loads(Path(allied_path).read_text(encoding="utf-8"))
        index = cls(df, embeddings, allied_data)
        index.build_seconds = time.monotonic() - t0
        return index

    # --- ranking primitives -------------------------------------------------

    def _dense_scores(self, query: str) -> np.ndarray:
        qvec = embed_query(query)
        return self.embeddings @ qvec

    def _bm25_scores(self, query: str) -> np.ndarray:
        return np.asarray(self.bm25.get_scores(_tokenize(query)), dtype=np.float64)

    @staticmethod
    def _ranks_from_scores(scores: np.ndarray) -> np.ndarray:
        """1-indexed rank per row, descending score, ties broken by original
        row order (stable sort preserves that automatically)."""
        order = np.argsort(-scores, kind="stable")
        ranks = np.empty(len(scores), dtype=np.int64)
        ranks[order] = np.arange(1, len(scores) + 1)
        return ranks

    def _top_k_from_scores(self, scores: np.ndarray, dense_scores: np.ndarray, top_k: int,
                            match_type: str, exclude: Optional[set[int]] = None) -> list[SearchResult]:
        if exclude:
            scores = scores.copy()
            for i in exclude:
                scores[i] = -np.inf
        order = np.argsort(-scores, kind="stable")[:top_k]
        return [SearchResult(int(i), float(scores[i]), float(dense_scores[i]), match_type) for i in order]

    def _bm25_has_signal(self, bm25_scores: np.ndarray) -> bool:
        return float(bm25_scores.max()) >= BM25_SIGNAL_THRESHOLD

    # --- eval-only single-path variants --------------------------------------

    def search_bm25_only(self, query: str, top_k: int = 5) -> list[SearchResult]:
        dense_scores = self._dense_scores(query)
        return self._top_k_from_scores(self._bm25_scores(query), dense_scores, top_k, "hybrid")

    def search_dense_only(self, query: str, top_k: int = 5, exclude: Optional[set[int]] = None) -> list[SearchResult]:
        dense_scores = self._dense_scores(query)
        return self._top_k_from_scores(dense_scores, dense_scores, top_k, "hybrid", exclude)

    def _rrf_fused_scores(self, query: str) -> tuple[np.ndarray, np.ndarray]:
        dense_scores = self._dense_scores(query)
        dense_ranks = self._ranks_from_scores(dense_scores)
        bm25_ranks = self._ranks_from_scores(self._bm25_scores(query))
        fused = 1.0 / (RRF_K + dense_ranks) + 1.0 / (RRF_K + bm25_ranks)
        return fused, dense_scores

    def search_hybrid_rrf(self, query: str, top_k: int = 5, exclude: Optional[set[int]] = None) -> list[SearchResult]:
        """Unconditional RRF -- always fuses, regardless of BM25 signal.
        Kept for eval comparison against the conditional path; production
        /recommend uses search_conditional() instead (see Part A)."""
        fused, dense_scores = self._rrf_fused_scores(query)
        if exclude:
            fused = fused.copy()
            for i in exclude:
                fused[i] = -np.inf
        order = np.argsort(-fused, kind="stable")[:top_k]
        # Normalize by the THEORETICAL max RRF score (both retrievers rank
        # this row #1: 2/(k+1)), not the top result's own score. Dividing by
        # the per-query top score would make rank-1 always display as 1.0
        # regardless of match quality -- exactly the "rescale to look
        # confident" the hard rules forbid, and it would silently defeat the
        # eval harness's no-answer-query check (a weak top match must still
        # look weak).
        theoretical_max = 2.0 / (RRF_K + 1)
        return [SearchResult(int(i), float(fused[i] / theoretical_max), float(dense_scores[i]), "hybrid", "hybrid") for i in order]

    def search_conditional(self, query: str, top_k: int = 5, exclude: Optional[set[int]] = None) -> list[SearchResult]:
        """Fusion conditional on BM25 actually showing lexical signal
        (BM25_SIGNAL_THRESHOLD): RRF-fuse when it does, rank on dense alone
        when it doesn't. This is what search()/production /recommend uses
        for the non-exact-identifier portion of results."""
        bm25_scores = self._bm25_scores(query)
        if self._bm25_has_signal(bm25_scores):
            dense_scores = self._dense_scores(query)
            dense_ranks = self._ranks_from_scores(dense_scores)
            bm25_ranks = self._ranks_from_scores(bm25_scores)
            fused = 1.0 / (RRF_K + dense_ranks) + 1.0 / (RRF_K + bm25_ranks)
            if exclude:
                fused = fused.copy()
                for i in exclude:
                    fused[i] = -np.inf
            order = np.argsort(-fused, kind="stable")[:top_k]
            theoretical_max = 2.0 / (RRF_K + 1)
            return [SearchResult(int(i), float(fused[i] / theoretical_max), float(dense_scores[i]), "hybrid", "hybrid") for i in order]
        else:
            dense_scores = self._dense_scores(query)
            results = self._top_k_from_scores(dense_scores, dense_scores, top_k, "hybrid", exclude)
            for r in results:
                r.retrieval_mode = "dense_only"
            return results

    # --- full pipeline: exact identifier short-circuit + fusion for the rest ---

    def search_hybrid_with_exact(self, query: str, top_k: int = 5) -> list[SearchResult]:
        """Exact-identifier short-circuit + UNCONDITIONAL RRF for the rest.
        Kept for eval comparison ("Hybrid + exact-identifier" config);
        production /recommend uses search_conditional_with_exact() instead."""
        match = extract_identifier(query)
        if match is None:
            return self.search_hybrid_rrf(query, top_k)

        row_idx = resolve_identifier(match, self.df)
        if row_idx is None:
            return self.search_hybrid_rrf(query, top_k)

        dense_scores = self._dense_scores(query)
        results = [SearchResult(row_idx, 1.0, float(dense_scores[row_idx]), "exact_identifier", "exact_identifier")]
        if top_k > 1:
            results += self.search_hybrid_rrf(query, top_k - 1, exclude={row_idx})
        return results

    def search_conditional_with_exact(self, query: str, top_k: int = 5) -> list[SearchResult]:
        """Exact-identifier short-circuit + CONDITIONAL fusion for the rest.
        This is production /recommend's actual ranking path (search())."""
        match = extract_identifier(query)
        if match is None:
            return self.search_conditional(query, top_k)

        row_idx = resolve_identifier(match, self.df)
        if row_idx is None:
            return self.search_conditional(query, top_k)

        dense_scores = self._dense_scores(query)
        results = [SearchResult(row_idx, 1.0, float(dense_scores[row_idx]), "exact_identifier", "exact_identifier")]
        if top_k > 1:
            results += self.search_conditional(query, top_k - 1, exclude={row_idx})
        return results

    def search(self, query: str, top_k: int = 5) -> list[SearchResult]:
        return self.search_conditional_with_exact(query, top_k)

    # --- abstention gate -------------------------------------------------------

    def max_dense_similarity(self, query: str) -> float:
        """Best dense cosine similarity across the whole corpus for `query`,
        independent of fusion/ranking -- the honest confidence signal."""
        return float(self._dense_scores(query).max())

    def compute_confidence(self, query: str, top_results: list[SearchResult]) -> tuple[float, str, bool, Optional[str]]:
        """Returns (confidence_signal, confidence_band, abstained, abstain_reason).

        confidence_band is one of "high" | "moderate" | "low".
        `abstained` is kept for wire compatibility and is True only for the
        "low" band -- moderate-confidence results are still returned and
        shown normally, just marked as lower confidence, rather than
        refused outright (see LOW_CONFIDENCE_BOUNDARY).

        Never gates an exact-identifier match -- see ABSTENTION_THRESHOLD's
        docstring for why dense similarity is the wrong signal there."""
        confidence_signal = self.max_dense_similarity(query)
        if top_results and top_results[0].match_type == "exact_identifier":
            return confidence_signal, "high", False, None

        if confidence_signal <= LOW_CONFIDENCE_BOUNDARY:
            reason = (f"No standard in the corpus scored above the low-confidence boundary "
                      f"(best dense similarity {confidence_signal:.3f} <= {LOW_CONFIDENCE_BOUNDARY})")
            return confidence_signal, "low", True, reason
        if confidence_signal < ABSTENTION_THRESHOLD:
            return confidence_signal, "moderate", False, None
        return confidence_signal, "high", False, None

    def row_for(self, is_number: Optional[int], part: Optional[str]) -> Optional[dict]:
        """The wire-shaped dict for the corpus row matching (is_number, part)
        exactly, or None if no such row exists. Used by the tender audit to
        look up a cited standard's own record (latest_version, category, ...)."""
        if is_number is None:
            return None
        target_part = part or None
        matches = self.df.index[
            (self.df["is_number"] == is_number) & (self.df["part"].apply(lambda p: (p or None) == target_part))
        ]
        if len(matches) == 0:
            return None
        row_idx = self.df.index.get_loc(matches[0])
        return self.to_wire(SearchResult(row_idx, 0.0, 0.0, "cited"))

    def is_primary_standard(self, is_number: Optional[int], part: Optional[str]) -> bool:
        """Whether (is_number, part) is one of the 45 primaries in the allied
        mapping -- i.e. whether we have ANY basis (even an empty one) for
        asserting what its normative references are. Distinct from
        allied_for() returning empty groups, which happens both for a real
        primary with genuinely no refs in a given bucket AND for a standard
        we've never mapped at all -- callers that need to tell those two
        apart (the tender audit's 'no allied mapping available' case) use
        this first."""
        if is_number is None:
            return False
        target_part = part or None
        return any(
            entry.get("primary_is_number") == is_number and (entry.get("primary_part") or None) == target_part
            for entry in self.allied_data
        )

    # --- allied standards join -----------------------------------------------

    def allied_for(self, is_number: Optional[int], part: Optional[str]) -> dict[str, list[dict]]:
        groups: dict[str, list[dict]] = {g: [] for g in _RELATIONSHIP_GROUPS}
        if is_number is None:
            return groups

        target_part = part or None
        for entry in self.allied_data:
            if entry.get("primary_is_number") != is_number:
                continue
            if (entry.get("primary_part") or None) != target_part:
                continue
            for allied in entry.get("allied_standards", []):
                bucket = _RELATIONSHIP_REMAP.get(allied.get("relationship"))
                if bucket is None:
                    continue
                groups[bucket].append({
                    "standard_number": allied.get("standard_normalized") or allied.get("standard"),
                    "title": allied.get("title"),
                    "relationship_type": bucket,
                    "description": _nullable(allied.get("note")),
                    "is_mandatory": None,  # no source field for this -- never guessed
                })
            break  # (is_number, part) is unique among primaries
        return groups

    # --- wire-shape mapping ---------------------------------------------------

    def to_wire(self, result: SearchResult) -> dict:
        row = self.df.iloc[result.row_index]
        return {
            "standard_number": row["standard_number"],
            "title": row["title"],
            "similarity_score": result.dense_score,   # honest confidence signal, never the fused rank score
            "fusion_rank_score": result.fused_score,  # RRF/debugging only -- not a confidence measure
            "category": row["category"],
            "certification_badge": row["certification_type"],  # verbatim, e.g. "Not determined" -- never remapped
            "year_published": _nullable_int(row["year_published"]),
            "scope_description": _nullable(row["scope_description"]),
            "scope_source": _nullable(row["scope_source"]),
            "latest_version": _nullable(row["latest_version"]),
            "version_source": _nullable(row["version_source"]),
            "amendment_count": _nullable_int(row["amendment_count"]),
            "mandatory": _nullable_bool(row["mandatory"]),
            "certification_source": _nullable(row["certification_source"]),
            "qco_reference": _nullable(row["qco_reference"]),
            "confidence": _nullable(row["confidence"]),
            "source": _nullable(row["source"]),
            "source_url": _nullable(row["source_url"]),
            "match_type": result.match_type,
            "retrieval_mode": result.retrieval_mode,
        }
