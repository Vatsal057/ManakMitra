"""Exact IS-number identifier detection for the retrieval pipeline.

This does NOT reimplement IS-number parsing -- it only finds a candidate
substring that looks identifier-shaped, then hands it to the one true
normalizer (`normalize_standard_number`) for all real parsing. Keeping the
regex here loose and dumb is deliberate: precision belongs in the
normalizer, not duplicated here.
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from data_pipeline.normalize import normalize_standard_number, NormalizedStandard

# Native-script transliterations of the "IS" standards prefix, one per
# non-English language the frontend supports (src/services/mockData.ts
# SUPPORTED_LANGUAGES). Sourced from NLLB's own en->lang generation (see
# scripts/precache_translations.py / data/cache/translations.json) rather
# than guessed -- transliteration of an acronym isn't something to invent.
# Gujarati and Telugu keep "IS" in Latin script in NLLB's own output, so
# they need no entry here; the Latin branch below already covers them.
_IS_TRANSLITERATIONS = (
    "आईएस",  # Hindi
    "आयएस",  # Marathi -- different spelling from Hindi despite sharing Devanagari
    "আইএস",  # Bengali
    "ಐಎಸ್",  # Kannada
    "ஐஎஸ்",  # Tamil
)
_NATIVE_ALT = "|".join(re.escape(t) for t in _IS_TRANSLITERATIONS)

# Loose trigger: "IS"/"IS/ISO" (Latin) or a known native transliteration,
# followed eventually by 2-6 digits (re's \d is Unicode-aware, so this
# matches Devanagari/Bengali digit strings too -- int() on the matched
# substring parses them natively, no separate digit-script conversion
# needed), optionally with a colon, part markers, or a year. Detection runs
# on the ORIGINAL non-English text, before any translation call -- NLLB
# translates short bare identifiers unreliably (e.g. Marathi/Kannada "IS
# 1786" can come back as "ISI 1786" or hallucinate entirely), so this must
# not depend on translation quality. normalize_standard_number does the
# actual parsing once we hand it this substring.
_TRIGGER_RE = re.compile(
    r"(?:IS(?:/ISO)?|" + _NATIVE_ALT + r")\s*[:\s]?\s*\d{2,6}(?:[\s:\-\(][^,\n]{0,40})?",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class IdentifierMatch:
    is_number: int
    part: Optional[str]
    normalized: NormalizedStandard


def extract_identifier(query: str) -> Optional[IdentifierMatch]:
    """Return an IdentifierMatch if `query` names a specific IS standard,
    else None for ordinary free-text specifications."""
    m = _TRIGGER_RE.search(query)
    if not m:
        return None

    norm = normalize_standard_number(m.group())
    if norm.is_number is None:
        return None
    return IdentifierMatch(is_number=norm.is_number, part=norm.part, normalized=norm)


def split_identifier_from_text(query: str) -> tuple[Optional[IdentifierMatch], str]:
    """Find the first identifier in `query` and return it along with
    whatever text is left after removing that match's span.

    Used for mixed non-English queries (an identifier plus descriptive
    text) so only the descriptive remainder needs translation -- the
    identifier itself is resolved directly, on the original text, and never
    passed through NLLB. Returns (None, query) unchanged when no identifier
    is found.
    """
    m = _TRIGGER_RE.search(query)
    if not m:
        return None, query

    norm = normalize_standard_number(m.group())
    if norm.is_number is None:
        return None, query

    match = IdentifierMatch(is_number=norm.is_number, part=norm.part, normalized=norm)
    remainder = (query[: m.start()] + " " + query[m.end():]).strip()
    return match, remainder


def find_all_identifiers(text: str) -> list[IdentifierMatch]:
    """Every IS-number citation in `text` (a tender clause may cite more
    than one standard). Intended for short-ish text (a single clause) --
    the trigger regex's lookahead window can swallow the start of a
    following citation on long spans, so callers scanning a whole document
    should call this per-clause and combine, not on the raw document text."""
    matches = []
    for m in _TRIGGER_RE.finditer(text):
        norm = normalize_standard_number(m.group())
        if norm.is_number is not None:
            matches.append(IdentifierMatch(is_number=norm.is_number, part=norm.part, normalized=norm))
    return matches


def resolve_identifier(match: IdentifierMatch, df) -> Optional[int]:
    """Resolve `match` to a positional row index in `df`, exact
    (is_number, part) pair only -- never falls back to bare is_number when
    the corpus has multiple parts for that number (mirrors the IS 302
    certification-join bug fix elsewhere in this project)."""
    candidates = df.index[df["is_number"] == match.is_number]
    if len(candidates) == 0:
        return None

    target_part = match.part or None
    for idx in candidates:
        row_part = df.at[idx, "part"] or None
        if row_part == target_part:
            return df.index.get_loc(idx)

    # No exact part match. If there's exactly one row for this is_number,
    # a missing/mismatched part on the query is forgivable (e.g. user typed
    # "IS 456" for a standard that happens to have no parts anyway).
    if len(candidates) == 1:
        return df.index.get_loc(candidates[0])

    return None
