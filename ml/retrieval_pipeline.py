"""Task 3 — semantic retrieval pipeline for Indian Standards (IS) recommendation.

Public API (this is what the Task 4 FastAPI backend imports)::

    from ml.retrieval_pipeline import recommend_standards
    results = recommend_standards("supply of 53 grade OPC cement", top_k=5)

Each result is a dict::

    {
      "rank": 1,
      "standard_number": "IS 269:2015",
      "title": "Ordinary Portland Cement - Specification",
      "similarity_score": 0.71,      # raw cosine similarity, 0..1
      "score": 0.78,                 # after rerank boosts, 0..1
      "category": "Cement",
      "certification_type": "BIS Product Certification",
      "latest_version": "2015 (Amendment 2)",
      "status": "active",
      "scope_snippet": "Specification for ordinary Portland cement of 33, 43 ...",
      "match_reasons": ["strong semantic match", "category 'Cement' mentioned in query"],
      "retrieval_mode": "semantic",
      "needs_verification": false
    }

CLI::

    python -m ml.retrieval_pipeline --query "PVC insulated copper wiring cable 1100V"
    python -m ml.retrieval_pipeline --demo
    python -m ml.retrieval_pipeline --interactive
    python -m ml.retrieval_pipeline --dataset ml/data/is_standards.csv --top-k 8
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

import numpy as np

# Support both `python -m ml.retrieval_pipeline` and `python ml/retrieval_pipeline.py`.
try:
    from ml.embeddings import EmbeddingBackend, get_backend, tokenize
except ImportError:  # pragma: no cover
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from ml.embeddings import EmbeddingBackend, get_backend, tokenize

logger = logging.getLogger(__name__)

PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_DIR.parent
CACHE_DIR = PACKAGE_DIR / ".cache"
DATA_DIR = PROJECT_ROOT / "data"

# Curated rows covering the product categories the scraped dataset misses
# (cables, LPG, toys, drinking water, IT/electronics, jewellery). Merged on top
# of the primary dataset, and used on its own if no primary dataset exists.
SUPPLEMENT_DATASET = DATA_DIR / "curated_standards_supplement.json"

# Certification scheme overlay (the scraped dataset has no such column).
CERTIFICATION_MAP = DATA_DIR / "certification_map.json"

# First existing path wins. A hand-curated is_standards.* takes priority over
# the scraped Task 1 output.
DATASET_CANDIDATES = (
    DATA_DIR / "is_standards.json",
    DATA_DIR / "is_standards.csv",
    DATA_DIR / "bis_standards_dataset.json",
    DATA_DIR / "bis_standards_dataset.csv",
    SUPPLEMENT_DATASET,
)


DATASET_ENV_VAR = "MANAKMITRA_DATASET"


def resolve_default_dataset() -> Path:
    """Pick the best dataset available, honouring the env override.

    Set ``MANAKMITRA_DATASET`` to point the API or CLI at a different dataset
    without editing code.
    """
    override = os.environ.get(DATASET_ENV_VAR)
    if override:
        return Path(override).expanduser()
    for candidate in DATASET_CANDIDATES:
        if candidate.exists():
            return candidate
    return SUPPLEMENT_DATASET


DEFAULT_DATASET = resolve_default_dataset()

REQUIRED_FIELDS = ("standard_number", "title")

# Column aliases seen across the Task 1 dataset iterations and public sources.
# Maps alias -> canonical field name.
FIELD_ALIASES = {
    "is_number": "standard_number",
    "is_no": "standard_number",
    "std_no": "standard_number",
    "standard": "standard_number",
    "standard_no": "standard_number",
    "number": "standard_number",
    "standard_title": "title",
    "name": "title",
    "scope": "scope_description",
    "abstract": "scope_description",
    "description": "scope_description",
    "sector": "category",
    "division": "category",
    "department": "category",
    "year_published": "year",
    "published_year": "year",
    "publication_year": "year",
    "edition": "latest_version",
    "version": "latest_version",
    "revision": "latest_version",
    "certification": "certification_type",
    "certification_scheme": "certification_type",
    "conformity_scheme": "certification_type",
}

OPTIONAL_FIELDS = {
    "scope_description": "",
    "category": "Uncategorized",
    "latest_version": "",
    "year": None,
    "certification_type": "None",
    "status": "active",
    "source_confidence": "unknown",
}

# Tuning knobs for the reranker. Kept as module constants so they are easy to
# sweep during demo prep.
SEMANTIC_WEIGHT = 0.80
CATEGORY_BOOST = 0.10
TITLE_OVERLAP_BOOST = 0.08
CERTIFICATION_BOOST = 0.02
OUTDATED_PENALTY = 0.12
CANDIDATE_MULTIPLIER = 4  # retrieve more than top_k, then rerank
MIN_SCORE = 0.05  # below this, treat as "no strong match"

# Words that carry no signal in procurement prose and pollute overlap scoring.
_STOPWORDS = {
    "and", "for", "the", "with", "of", "to", "in", "as", "per", "a", "an", "or",
    "is", "on", "by", "at", "from", "shall", "be", "must", "should", "supply",
    "supplied", "procurement", "tender", "specification", "specifications",
    "requirement", "requirements", "quality", "grade", "type", "standard",
    "standards", "indian", "bis", "code", "practice", "part", "no", "nos",
    "item", "items", "make", "makes", "conforming", "conform", "conformity",
    "approved", "relevant", "latest", "amendment", "amendments", "used", "use",
}

_IS_NUMBER_RE = re.compile(r"\bis[\s:\-]*(\d{2,5})\b", re.IGNORECASE)

DEMO_QUERIES = [
    "Supply of 53 grade ordinary Portland cement in 50 kg bags for bridge foundation work",
    "Procurement of thermo-mechanically treated ribbed reinforcement bars Fe 500D for RCC slabs",
    "14.2 kg domestic cooking gas cylinders with self-closing valve for household distribution",
    "Copper conductor insulated flexible wiring cable 1.5 sq mm for internal building electrification",
    "Plastic building blocks and pull-along toys for anganwadi centres, children aged 2 to 5 years",
    "Bottled mineral water 1 litre sealed bottles for office pantry supply",
    "Laptops and tablet computers with lithium ion battery packs and power adaptors for school lab",
    "22 carat gold ornaments for museum display procurement",
]


# --------------------------------------------------------------------------- #
# Dataset loading
# --------------------------------------------------------------------------- #

_ROMAN = {
    "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8,
    "ix": 9, "x": 10, "xi": 11, "xii": 12, "xiii": 13, "xiv": 14, "xv": 15,
    "xvi": 16, "xvii": 17, "xviii": 18, "xix": 19, "xx": 20,
}
_YEAR_RE = re.compile(r"(?:19|20)\d{2}")
MAX_PLAUSIBLE_YEAR = datetime.now().year + 1


def _part_number(token: str) -> str:
    """'IV' -> '4', '12' -> '12'."""
    token = token.strip().lower()
    if token.isdigit():
        return str(int(token))
    return str(_ROMAN[token]) if token in _ROMAN else ""


def _parse_number(standard_number: str) -> tuple[str, str, Optional[int]]:
    """Split a messy standard number into (base, part, year).

    The Task 1 dataset mixes at least six formats::

        IS 269 - 2015     IS: 9103        IS 4375 : 2019
        IS 2911-1-1       IS 432 (P II) 1966      IS:2720 (Part.29) 1975

    Returns e.g. ``("2720", "29", 1975)``. ``part`` is empty for a parent
    document, and multi-part listings such as "(Parts I TO IV)" are treated as
    the parent. ``year`` is only taken from text *after* the base number, so
    "IS 2090" does not get read as the year 2090.
    """
    text = standard_number.strip()
    body = re.sub(r"^\s*is[\s:.\-]*", "", text, flags=re.IGNORECASE)
    match = re.search(r"\d{1,5}", body)
    if not match:
        return text.upper(), "", None

    base = str(int(match.group(0)))
    tail = body[match.end():]
    low = tail.lower()

    year_match = _YEAR_RE.search(tail)
    year = int(year_match.group(0)) if year_match else None
    if year is not None and not 1900 <= year <= MAX_PLAUSIBLE_YEAR:
        year = None

    part = ""
    if "part" in low or re.search(r"\bp[\s.]*[ivx]+\b", low):
        # "(Parts I TO IV)" / "(part 1&2)" list several parts -> parent document.
        if re.search(r"parts|\bto\b|&|,", low):
            part = ""
        else:
            token = re.search(r"(?:part|p)[\s.:]*([0-9ivx]+)", low)
            part = _part_number(token.group(1)) if token else ""
    else:
        dashed = re.match(r"\s*[-–/]\s*(\d+(?:\s*[-–/]\s*\d+)*)", tail)
        if dashed:
            numbers = [n for n in re.findall(r"\d+", dashed.group(1)) if not _YEAR_RE.fullmatch(n)]
            part = ".".join(str(int(n)) for n in numbers)
    return base, part, year


def _canonical_key(standard_number: str) -> str:
    """Identity used for deduplication: same base + same part == same standard."""
    base, part, _ = _parse_number(standard_number)
    return f"IS{base}|{part}"


def _row_richness(row: Dict[str, Any]) -> tuple:
    """Sort key for picking the best row among duplicates."""
    scope_words = len(tokenize(str(row.get("scope_description") or "")))
    populated = sum(
        1
        for key in ("category", "latest_version", "year", "certification_type", "status")
        if str(row.get(key) or "").strip() and str(row.get(key)).lower() not in {"none", "uncategorized"}
    )
    has_year = 1 if _YEAR_RE.search(row["standard_number"]) else 0
    return (scope_words, populated, has_year, len(row["standard_number"]))


def _merge_duplicates(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Collapse rows that describe the same standard under different formats.

    The dataset contains e.g. ``IS: 3495`` and ``IS 3495 (Parts I TO iv) 1976``.
    The richest row wins; the others are recorded in ``also_known_as`` and used
    to fill any blank fields.
    """
    groups: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        groups.setdefault(_canonical_key(row["standard_number"]), []).append(row)

    merged: List[Dict[str, Any]] = []
    collapsed = 0
    for group in groups.values():
        if len(group) == 1:
            merged.append(group[0])
            continue
        group = sorted(group, key=_row_richness, reverse=True)
        best, others = dict(group[0]), group[1:]
        for other in others:
            for key, value in other.items():
                current = best.get(key)
                empty = current is None or (
                    isinstance(current, str)
                    and (not current.strip() or current.lower() in {"none", "uncategorized"})
                )
                if empty and value not in (None, ""):
                    best[key] = value
        # Prefer the dated form for display ("IS 1489 (part 1&2) 1991" reads
        # better than "IS: 1489") even when the other row had richer text.
        aliases = [o["standard_number"] for o in others]
        if not _YEAR_RE.search(best["standard_number"]):
            dated = next((a for a in aliases if _YEAR_RE.search(a)), None)
            if dated:
                aliases = [a for a in aliases if a != dated] + [best["standard_number"]]
                best["standard_number"] = dated
        best["also_known_as"] = aliases
        collapsed += len(others)
        merged.append(best)

    if collapsed:
        logger.info("Merged %d duplicate row(s) referring to the same standard.", collapsed)
    return merged


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "yes", "y"}


def _apply_aliases(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Rename known alias columns to canonical field names, without clobbering."""
    row: Dict[str, Any] = {}
    for key, value in raw.items():
        if not key:
            continue
        key = key.strip()
        canonical = FIELD_ALIASES.get(key.lower(), key)
        # An explicit canonical column always wins over an alias.
        if canonical in row and str(row[canonical] or "").strip():
            continue
        row[canonical] = value
    return row


def _coerce_row(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Normalise one dataset row, or return None if unusable."""
    row = _apply_aliases(raw)
    standard_number = str(row.get("standard_number") or "").strip()
    title = str(row.get("title") or "").strip()
    if not standard_number or not title:
        return None

    clean: Dict[str, Any] = {"standard_number": standard_number, "title": title}
    for field_name, default in OPTIONAL_FIELDS.items():
        value = row.get(field_name, default)
        if value is None or (isinstance(value, str) and not value.strip()):
            value = default
        if field_name == "year" and value not in (None, ""):
            match = re.search(r"(19|20)\d{2}", str(value))
            value = int(match.group(0)) if match else None
            # The scraped dataset contains impossible years (e.g. 2090, 2062
            # lifted out of a title). Drop them instead of showing them as fact.
            if value is not None and not 1900 <= value <= MAX_PLAUSIBLE_YEAR:
                value = None
        if isinstance(value, str):
            value = value.strip()
        clean[field_name] = value

    base, part, year_in_number = _parse_number(standard_number)
    clean["base_number"] = base
    clean["part"] = part
    if clean["year"] is None and year_in_number is not None:
        clean["year"] = year_in_number

    # In the current dataset `latest_version` often holds an amendment count
    # ("Amendments: 6") rather than a version. Split that into its own field so
    # the UI can show "latest version" and "amendments" separately.
    amendments: Optional[int] = None
    raw_amendments = row.get("amendments")
    if raw_amendments not in (None, ""):
        try:
            amendments = int(str(raw_amendments).strip())
        except (TypeError, ValueError):
            amendments = None
    version_text = str(clean["latest_version"])
    amendment_match = re.search(r"amendment[s]?\s*[:\-]?\s*(\d+)", version_text, re.IGNORECASE)
    if amendment_match:
        amendments = int(amendment_match.group(1))
        clean["latest_version"] = ""
    clean["amendments"] = amendments

    if not clean["latest_version"]:
        clean["latest_version"] = str(year_in_number or clean["year"] or "")

    # Task 1 emits needs_review/review_reason instead of source_confidence.
    if "needs_review" in row:
        needs_review = _as_bool(row.get("needs_review"))
        clean["needs_review"] = needs_review
        if clean["source_confidence"] == OPTIONAL_FIELDS["source_confidence"]:
            clean["source_confidence"] = "low" if needs_review else "medium"
    else:
        clean["needs_review"] = clean["source_confidence"] in {"low", "unknown"}

    # Carry through any extra columns the dataset may add (source, review_reason...).
    for key, value in row.items():
        clean.setdefault(key, value)
    return clean


def read_standards_file(path: Path | str) -> List[Dict[str, Any]]:
    """Read and normalise one dataset file (no merging, no overlay).

    Accepts a JSON list, a JSON object with a ``standards``/``data`` key, JSONL,
    or a CSV/TSV with a header row. Rows missing ``standard_number`` or ``title``
    are dropped with a warning.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"Standards dataset not found: {path}. Pass --dataset, set "
            f"${DATASET_ENV_VAR}, or place the Task 1 output at "
            f"{DATASET_CANDIDATES[2].name} in the project root."
        )

    if path.suffix.lower() in {".json", ".jsonl"}:
        text = path.read_text(encoding="utf-8")
        if path.suffix.lower() == ".jsonl":
            raw_rows = [json.loads(line) for line in text.splitlines() if line.strip()]
        else:
            payload = json.loads(text)
            if isinstance(payload, dict):
                payload = payload.get("standards") or payload.get("data") or []
            raw_rows = list(payload)
    elif path.suffix.lower() in {".csv", ".tsv"}:
        delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
        with path.open(newline="", encoding="utf-8-sig") as handle:
            raw_rows = list(csv.DictReader(handle, delimiter=delimiter))
    else:
        raise ValueError(f"Unsupported dataset format: {path.suffix} (use .json/.jsonl/.csv)")

    rows: List[Dict[str, Any]] = []
    dropped = 0
    for raw in raw_rows:
        if not isinstance(raw, dict):
            dropped += 1
            continue
        clean = _coerce_row(raw)
        if clean is None:
            dropped += 1
            continue
        rows.append(clean)

    if dropped:
        logger.warning(
            "Dropped %d row(s) from %s missing standard_number/title.", dropped, path.name
        )
    if not rows:
        raise ValueError(f"No usable rows in {path}")
    logger.info("Read %d rows from %s", len(rows), path.name)
    return rows


def load_certification_map(path: Path | str = CERTIFICATION_MAP) -> Dict[str, Dict[str, Any]]:
    """Load the certification overlay. Returns an empty dict if absent."""
    path = Path(path)
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Ignoring unreadable certification map %s (%s)", path, exc)
        return {}
    entries = payload.get("entries", payload) if isinstance(payload, dict) else {}
    return {str(k): v for k, v in entries.items() if not str(k).startswith("_")}


def apply_certification_map(
    rows: List[Dict[str, Any]],
    mapping: Dict[str, Dict[str, Any]],
) -> int:
    """Tag rows with their certification scheme in place. Returns rows tagged.

    A ``"base|part"`` entry takes precedence over a bare ``"base"`` entry. Rows
    that already carry a real certification_type are left alone, so a future
    Task 1 column always wins over this overlay.
    """
    if not mapping:
        return 0
    tagged = 0
    for row in rows:
        base, part = row.get("base_number", ""), row.get("part", "")
        entry = mapping.get(f"{base}|{part}") if part else None
        entry = entry or mapping.get(base)
        if not entry:
            continue

        existing = str(row.get("certification_type") or "None")
        already_tagged = existing.lower() not in {"none", "", "na", "n/a", "unknown"}
        if not already_tagged:
            row["certification_type"] = entry.get("certification_type", "None")
            tagged += 1
        # Fill the explanatory fields either way, so a row that arrived with a
        # scheme but no justification still gets one.
        row.setdefault("certification_basis", entry.get("basis", ""))
        row.setdefault("certification_confidence", entry.get("confidence", "medium"))
        if entry.get("reference"):
            row.setdefault("certification_reference", entry["reference"])
    return tagged


def load_standards(
    path: Path | str = DEFAULT_DATASET,
    supplement_path: Path | str | None = SUPPLEMENT_DATASET,
    certification_map_path: Path | str | None = CERTIFICATION_MAP,
    include_allied: bool = True,
) -> List[Dict[str, Any]]:
    """Load the primary dataset, merge the curated supplement, tag certification.

    The supplement is skipped when it *is* the primary dataset, and merging is
    by canonical standard number, so a curated row and a scraped row for the
    same standard collapse into one entry.
    """
    path = Path(path)
    rows = read_standards_file(path)

    if supplement_path is not None:
        supplement_path = Path(supplement_path)
        if supplement_path.exists() and supplement_path.resolve() != path.resolve():
            supplement_rows = read_standards_file(supplement_path)
            rows.extend(supplement_rows)
            logger.info("Merged %d curated supplement row(s).", len(supplement_rows))

    rows = _merge_duplicates(rows)

    # Task 2's allied mapping cites standards the scraped dataset never had
    # (IS 1599 bend test, IS 228 chemical analysis, ...). Add them so they are
    # searchable rather than only reachable via the /allied endpoint.
    if include_allied:
        try:
            from ml.allied import get_allied_index  # local import: avoids a cycle

            keys = {_canonical_key(r["standard_number"]) for r in rows}
            allied_rows = [
                clean
                for clean in (_coerce_row(raw) for raw in get_allied_index().allied_rows(keys))
                if clean is not None
            ]
            if allied_rows:
                rows.extend(allied_rows)
                rows = _merge_duplicates(rows)
                logger.info(
                    "Added %d allied standard(s) cited by the Task 2 mapping but "
                    "absent from the dataset.",
                    len(allied_rows),
                )
        except Exception as exc:  # never let optional enrichment break loading
            logger.warning("Skipped allied-standard enrichment (%s)", exc)

    if certification_map_path is not None:
        tagged = apply_certification_map(rows, load_certification_map(certification_map_path))
        if tagged:
            logger.info("Tagged %d standard(s) with a certification scheme.", tagged)

    logger.info("Dataset ready: %d standards", len(rows))
    return rows


def _is_near_duplicate(a: str, b: str) -> bool:
    """True if two strings carry essentially the same tokens.

    In the current dataset most rows copy the title into scope_description; if we
    embedded both we would just amplify the title and distort the vector.
    """
    ta, tb = set(tokenize(a)), set(tokenize(b))
    if not ta or not tb:
        return False
    return len(ta & tb) / len(ta | tb) >= 0.85


def _document_text(row: Dict[str, Any]) -> str:
    """Build the text that gets embedded for one standard.

    Title is weighted by repetition, the category is appended as coarse domain
    context, and the scope is only added when it says something the title does
    not.
    """
    title = row["title"]
    category = str(row.get("category") or "").replace("&", " and ")
    scope = str(row.get("scope_description") or "")

    parts = [title, title, category]
    if scope and not _is_near_duplicate(title, scope):
        parts.append(scope)
    return " ".join(p for p in parts if p.strip()).strip()


# --------------------------------------------------------------------------- #
# Vector index
# --------------------------------------------------------------------------- #

class VectorIndex:
    """Cosine-similarity index. Uses FAISS when available, numpy otherwise.

    Vectors are expected to be L2-normalised, so inner product == cosine.
    """

    def __init__(self, vectors: np.ndarray):
        self.vectors = np.ascontiguousarray(vectors, dtype=np.float32)
        self.backend = "numpy"
        self._faiss_index = None
        try:
            import faiss  # noqa: PLC0415

            index = faiss.IndexFlatIP(self.vectors.shape[1])
            index.add(self.vectors)
            self._faiss_index = index
            self.backend = "faiss"
        except Exception as exc:  # faiss not installed, or dim mismatch
            logger.info("FAISS unavailable (%s); using numpy brute-force search.", exc)

    def search(self, query_vectors: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
        k = max(1, min(k, self.vectors.shape[0]))
        query_vectors = np.ascontiguousarray(query_vectors, dtype=np.float32)
        if self._faiss_index is not None:
            return self._faiss_index.search(query_vectors, k)
        sims = query_vectors @ self.vectors.T
        idx = np.argpartition(-sims, k - 1, axis=1)[:, :k]
        ordered = np.take_along_axis(sims, idx, axis=1).argsort(axis=1)[:, ::-1]
        idx = np.take_along_axis(idx, ordered, axis=1)
        scores = np.take_along_axis(sims, idx, axis=1)
        return scores, idx


# --------------------------------------------------------------------------- #
# Recommender
# --------------------------------------------------------------------------- #

@dataclass
class StandardsRecommender:
    """Loads a dataset, embeds it, and answers free-text queries."""

    dataset_path: Path | str = DEFAULT_DATASET
    backend_preference: str = "auto"
    use_cache: bool = True
    attach_allied: bool = True

    standards: List[Dict[str, Any]] = field(default_factory=list, init=False)
    backend: EmbeddingBackend = field(init=False, repr=False)
    index: VectorIndex = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.dataset_path = Path(self.dataset_path)
        self.standards = load_standards(self.dataset_path)
        documents = [_document_text(row) for row in self.standards]

        # digits -> positions, for exact "IS 456" lookups (a number like 9873 can
        # map to several parts, so keep a list).
        self._number_index: Dict[str, List[int]] = {}
        for position, row in enumerate(self.standards):
            digits = row.get("base_number") or self._primary_digits(row["standard_number"])
            if digits:
                self._number_index.setdefault(digits, []).append(position)

        self.backend = get_backend(self.backend_preference)
        self.backend.fit(documents)

        vectors = self._load_cached_vectors(documents)
        if vectors is None:
            vectors = self.backend.encode(documents)
            self._save_cached_vectors(documents, vectors)
        self.index = VectorIndex(vectors)

        self.retrieval_mode = "semantic" if self.backend.is_semantic else "lexical"
        logger.info(
            "Recommender ready: %d standards | embeddings=%s (%s) | index=%s",
            len(self.standards), self.backend.name, self.retrieval_mode, self.index.backend,
        )

    # -- embedding cache ---------------------------------------------------- #

    def _cache_path(self, documents: Sequence[str]) -> Path:
        digest = hashlib.sha256(
            ("\x00".join(documents) + "|" + self.backend.name).encode("utf-8")
        ).hexdigest()[:16]
        return CACHE_DIR / f"vectors_{digest}.npy"

    def _load_cached_vectors(self, documents: Sequence[str]) -> Optional[np.ndarray]:
        # Only neural backends are slow enough to be worth caching; the lexical
        # ones must be refit each run anyway to encode queries.
        if not self.use_cache or not self.backend.is_semantic:
            return None
        path = self._cache_path(documents)
        if not path.exists():
            return None
        try:
            vectors = np.load(path)
        except Exception as exc:
            logger.warning("Ignoring unreadable embedding cache %s (%s)", path, exc)
            return None
        if vectors.shape[0] != len(documents):
            return None
        logger.info("Reusing cached embeddings: %s", path.name)
        return vectors

    def _save_cached_vectors(self, documents: Sequence[str], vectors: np.ndarray) -> None:
        if not self.use_cache or not self.backend.is_semantic:
            return
        try:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            np.save(self._cache_path(documents), vectors)
        except Exception as exc:  # cache is best-effort
            logger.warning("Could not write embedding cache (%s)", exc)

    # -- scoring ------------------------------------------------------------ #

    @staticmethod
    def _content_tokens(text: str) -> set[str]:
        return {t for t in tokenize(text) if t not in _STOPWORDS and len(t) > 2}

    def _explicit_numbers(self, query: str) -> set[str]:
        """Standard numbers named directly in the query, e.g. 'as per IS 456'."""
        return {str(int(m.group(1))) for m in _IS_NUMBER_RE.finditer(query)}

    @staticmethod
    def _primary_digits(standard_number: str) -> Optional[str]:
        """'IS 9873 (Part 1):2019' -> '9873'."""
        base, _, _ = _parse_number(standard_number)
        return base or None

    def _positions_for_numbers(self, numbers: set[str]) -> List[int]:
        return [pos for number in numbers for pos in self._number_index.get(number, ())]

    def _rerank(
        self,
        query: str,
        candidates: Iterable[tuple[int, float]],
        top_k: int,
    ) -> List[Dict[str, Any]]:
        query_tokens = self._content_tokens(query)
        named_numbers = self._explicit_numbers(query)
        query_lower = query.lower()

        scored: List[Dict[str, Any]] = []
        for position, similarity in candidates:
            row = self.standards[position]
            similarity = float(max(0.0, min(1.0, similarity)))
            score = SEMANTIC_WEIGHT * similarity
            reasons: List[str] = []

            # Metadata boosts are scaled by similarity so a weak semantic match
            # cannot be lifted into the top results by metadata alone. This
            # matters because ~15% of the scraped rows sit in the wrong category
            # (soil tests filed under "Water & Environment", a steel wire
            # standard under "Electrical", and so on).
            boost_scale = similarity

            if similarity >= 0.55:
                reasons.append("strong semantic match on scope")
            elif similarity >= 0.30:
                reasons.append("moderate semantic match on scope")

            category = str(row.get("category") or "")
            category_tokens = self._content_tokens(category)
            if category_tokens and category_tokens & query_tokens:
                score += CATEGORY_BOOST * boost_scale
                reasons.append(f"category '{category}' referenced in query")

            title_tokens = self._content_tokens(row["title"])
            if title_tokens:
                overlap = len(title_tokens & query_tokens) / len(title_tokens)
                if overlap > 0:
                    score += TITLE_OVERLAP_BOOST * overlap * boost_scale
                    if overlap >= 0.25:
                        reasons.append("multiple title terms present in query")

            digits = row.get("base_number") or self._primary_digits(row["standard_number"])
            if digits and digits in named_numbers:
                score = 1.0
                reasons.insert(0, f"standard explicitly named in query ({row['standard_number']})")

            certification = str(row.get("certification_type") or "None")
            if certification.lower() not in {"none", "", "na", "n/a"}:
                score += CERTIFICATION_BOOST * boost_scale
                basis = str(row.get("certification_basis") or "").strip()
                hedge = (
                    " (indicative)"
                    if str(row.get("certification_confidence") or "") == "medium"
                    else ""
                )
                reasons.append(
                    f"certification applies: {certification}{hedge}"
                    + (f" - {basis}" if basis else "")
                )

            status = str(row.get("status") or "active").lower()
            if status in {"withdrawn", "superseded"}:
                score -= OUTDATED_PENALTY
                reasons.append(f"caution: standard marked {status}")

            needs_verification = bool(row.get("needs_review")) or str(
                row.get("source_confidence") or ""
            ).lower() in {"low", "unknown"}
            if needs_verification:
                review_reason = str(row.get("review_reason") or "").strip()
                detail = f" ({review_reason})" if review_reason else ""
                reasons.append(f"dataset entry needs manual verification{detail}")

            scope = str(row.get("scope_description") or "")
            scored.append(
                {
                    "standard_number": row["standard_number"],
                    # Format-independent identity. Use this to join against
                    # allied_standards_mapping.json / flagship_products.json,
                    # whose numbers are written differently.
                    "canonical_key": _canonical_key(row["standard_number"]),
                    "title": row["title"],
                    "similarity_score": round(similarity, 4),
                    "score": round(float(max(0.0, min(1.0, score))), 4),
                    "category": row.get("category") or "Uncategorized",
                    "certification_type": certification,
                    "certification_basis": row.get("certification_basis", ""),
                    "certification_confidence": row.get("certification_confidence", ""),
                    "certification_reference": row.get("certification_reference", ""),
                    "latest_version": row.get("latest_version") or "",
                    "amendments": row.get("amendments"),
                    "year": row.get("year"),
                    "status": row.get("status") or "active",
                    "also_known_as": row.get("also_known_as", []),
                    "scope_snippet": (scope[:240] + "...") if len(scope) > 240 else scope,
                    "match_reasons": reasons or ["weak match - shown for completeness"],
                    "retrieval_mode": self.retrieval_mode,
                    "needs_verification": needs_verification,
                    "source": row.get("source", ""),
                }
            )

        scored.sort(key=lambda item: (-item["score"], item["standard_number"]))
        strong = [item for item in scored if item["score"] >= MIN_SCORE]
        results = (strong or scored)[:top_k]
        for rank, item in enumerate(results, start=1):
            item["rank"] = rank
        _ = query_lower  # reserved for future phrase-level boosts
        return self._attach_allied(results)

    def _attach_allied(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Flag which results have a Task 2 allied mapping available."""
        if not self.attach_allied:
            return results
        try:
            from ml.allied import get_allied_index  # local import: avoids a cycle

            return get_allied_index().attach_to_results(results)
        except Exception as exc:
            logger.warning("Could not attach allied-standard flags (%s)", exc)
            for item in results:
                item.setdefault("has_allied", False)
                item.setdefault("allied_count", 0)
                item.setdefault("flagship_product", None)
            return results

    # -- public ------------------------------------------------------------- #

    def recommend(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not query or not query.strip():
            return []
        top_k = max(1, int(top_k))
        n_candidates = min(len(self.standards), max(top_k * CANDIDATE_MULTIPLIER, 20))

        query_vector = self.backend.encode([query.strip()])
        scores, indices = self.index.search(query_vector, n_candidates)
        candidates = [
            (int(pos), float(sim))
            for pos, sim in zip(indices[0], scores[0])
            if pos >= 0
        ]

        # A standard named outright in the spec text ("as per IS 456") must be
        # returned even if the embedding search misses it, so inject it into the
        # candidate set with its true cosine similarity before reranking.
        named_numbers = self._explicit_numbers(query)
        if named_numbers:
            already = {pos for pos, _ in candidates}
            for pos in self._positions_for_numbers(named_numbers):
                if pos not in already:
                    sim = float(query_vector[0] @ self.index.vectors[pos])
                    candidates.append((pos, sim))

        return self._rerank(query, candidates, top_k)

    def info(self) -> Dict[str, Any]:
        """Diagnostics for the Task 4 ``/health`` endpoint."""
        thin_scope = sum(
            1
            for r in self.standards
            if len(tokenize(str(r.get("scope_description") or ""))) < 12
        )
        no_certification = sum(
            1
            for r in self.standards
            if str(r.get("certification_type") or "None").lower() in {"none", ""}
        )
        return {
            "dataset_path": str(self.dataset_path),
            "standards_loaded": len(self.standards),
            "categories": sorted({str(r.get("category")) for r in self.standards}),
            "embedding_backend": self.backend.name,
            "retrieval_mode": self.retrieval_mode,
            "index_backend": self.index.backend,
            "data_quality": {
                "rows_needing_review": sum(
                    1 for r in self.standards if r.get("needs_review")
                ),
                "rows_with_thin_scope": thin_scope,
                "rows_without_certification_tag": no_certification,
            },
        }


# --------------------------------------------------------------------------- #
# Module-level singleton API (what the backend imports)
# --------------------------------------------------------------------------- #

_RECOMMENDER: Optional[StandardsRecommender] = None


def get_recommender(
    dataset_path: Path | str | None = None,
    backend_preference: str = "auto",
    reload: bool = False,
) -> StandardsRecommender:
    """Return the process-wide recommender, building it on first use."""
    global _RECOMMENDER
    if _RECOMMENDER is None or reload or (
        dataset_path is not None and Path(dataset_path) != _RECOMMENDER.dataset_path
    ):
        _RECOMMENDER = StandardsRecommender(
            dataset_path=dataset_path or DEFAULT_DATASET,
            backend_preference=backend_preference,
        )
    return _RECOMMENDER


def recommend_standards(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Recommend Indian Standards for a free-text product/tender description.

    This is the stable entry point for the Task 4 API. It lazily builds the
    index on the first call, so importing this module stays cheap.
    """
    return get_recommender().recommend(query, top_k=top_k)


# --------------------------------------------------------------------------- #
# CLI test harness
# --------------------------------------------------------------------------- #

def _bar(value: float, width: int = 20) -> str:
    filled = int(round(max(0.0, min(1.0, value)) * width))
    return "█" * filled + "·" * (width - filled)


def _print_results(query: str, results: List[Dict[str, Any]]) -> None:
    print(f"\n\033[1mQuery:\033[0m {query}")
    if not results:
        print("  no matches (empty query or empty dataset)")
        return
    if results[0]["score"] < MIN_SCORE:
        print("  ⚠  no strong matches found — consider rephrasing the specification")
    for item in results:
        cert = item["certification_type"]
        cert_tag = "" if cert.lower() == "none" else f"  [{cert}]"
        print(
            f"  {item['rank']}. {item['standard_number']} — {item['title'][:82]}"
            f"\n     {_bar(item['score'])} score={item['score']:.3f} "
            f"cos={item['similarity_score']:.3f} | {item['category']}"
            f" | v{item['latest_version'] or 'n/a'} | {item['status']}{cert_tag}"
        )
        for reason in item["match_reasons"]:
            print(f"     · {reason}")


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Semantic search over Indian Standards (SIH26108, Task 3)."
    )
    parser.add_argument("--query", "-q", action="append", help="query (repeatable)")
    parser.add_argument("--dataset", "-d", default=str(DEFAULT_DATASET), help="JSON/CSV dataset")
    parser.add_argument("--top-k", "-k", type=int, default=5)
    parser.add_argument(
        "--backend",
        default="auto",
        choices=["auto", "sentence-transformers", "tfidf", "hashing"],
        help="embedding backend (default: best available)",
    )
    parser.add_argument("--demo", action="store_true", help="run the built-in demo queries")
    parser.add_argument("--interactive", "-i", action="store_true", help="REPL mode")
    parser.add_argument("--json", action="store_true", help="print raw JSON instead of a table")
    parser.add_argument("--no-cache", action="store_true", help="ignore the embedding cache")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO if args.verbose else logging.WARNING,
        format="%(levelname)s %(name)s: %(message)s",
    )
    # Third-party model/download chatter drowns out our own logs.
    for noisy in ("httpx", "huggingface_hub", "urllib3", "filelock", "sentence_transformers"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    try:
        recommender = StandardsRecommender(
            dataset_path=args.dataset,
            backend_preference=args.backend,
            use_cache=not args.no_cache,
        )
    except (FileNotFoundError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    info = recommender.info()
    if not args.json:
        print(
            f"\033[1mIS Recommender\033[0m  standards={info['standards_loaded']}  "
            f"categories={len(info['categories'])}  "
            f"embeddings={info['embedding_backend']} ({info['retrieval_mode']})  "
            f"index={info['index_backend']}"
        )
        if info["retrieval_mode"] == "lexical":
            print(
                "  note: running on the lexical fallback — install "
                "sentence-transformers for true semantic ranking."
            )

    queries: List[str] = list(args.query or [])
    if args.demo or (not queries and not args.interactive):
        queries.extend(DEMO_QUERIES)

    payload = []
    for query in queries:
        results = recommender.recommend(query, top_k=args.top_k)
        if args.json:
            payload.append({"query": query, "results": results})
        else:
            _print_results(query, results)
    if args.json and payload:
        print(json.dumps(payload, indent=2, ensure_ascii=False))

    if args.interactive:
        print("\nInteractive mode — enter a product/tender description ('quit' to exit).")
        while True:
            try:
                query = input("\n> ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break
            if query.lower() in {"quit", "exit", "q"}:
                break
            if not query:
                continue
            _print_results(query, recommender.recommend(query, top_k=args.top_k))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
