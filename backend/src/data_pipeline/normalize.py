"""Canonical normalization for BIS/IS standard-number strings.

This is the single join key between ``bis_standards_dataset.csv`` and
``allied_standards_mapping.json``. Every one of the ~20 raw formatting
variants observed in those two files funnels through
``normalize_standard_number`` so both sides land on the same key.

Canonical output shape: ``IS <number>[-<part>][:<year>]`` (or ``IS/ISO``
when that's the source body). Part ranges/combinations (e.g. "Parts I TO
IV", "part 1&2") collapse to a hyphenated list ("1-4", "1-2") rather than
being fully expanded -- good enough to join on and to display, not a full
part-taxonomy model.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

_ROMAN_VALUES = [
    ("XX", 20), ("XIX", 19), ("XVIII", 18), ("XVII", 17), ("XVI", 16),
    ("XV", 15), ("XIV", 14), ("XIII", 13), ("XII", 12), ("XI", 11),
    ("X", 10), ("IX", 9), ("VIII", 8), ("VII", 7), ("VI", 6), ("V", 5),
    ("IV", 4), ("III", 3), ("II", 2), ("I", 1),
]
_ROMAN_TO_INT = dict(_ROMAN_VALUES)

_PREFIX_RE = re.compile(r"^\s*(IS/ISO|IS)\s*:?\s*(.*)$", re.IGNORECASE)
_PAREN_RE = re.compile(r"\(([^)]*)\)")
_YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")
_SKIP_WORDS = {"part", "parts", "p", "sec", "to", "and", ""}


@dataclass(frozen=True)
class NormalizedStandard:
    standard_number: str  # canonical, e.g. "IS 2720-4:1985"
    is_number: Optional[int]
    part: Optional[str]
    year: Optional[int]
    prefix: str  # "IS" or "IS/ISO"


def _roman_to_int(token: str) -> Optional[int]:
    return _ROMAN_TO_INT.get(token.upper())


def _parse_part(raw: str) -> Optional[str]:
    """Extract a normalized part identifier from parenthetical/part text."""
    if not raw or "relevant" in raw.lower():
        return None

    tokens = re.split(r"[\s./]+", raw.strip())
    result = []
    for tok in tokens:
        tok = tok.strip(".,")
        if not tok or tok.lower() in _SKIP_WORDS:
            continue
        for sub in re.split(r"&", tok):
            if not sub:
                continue
            if sub.isdigit():
                result.append(sub)
            elif re.fullmatch(r"[IVXLC]+", sub.upper()):
                roman_val = _roman_to_int(sub.upper())
                result.append(str(roman_val) if roman_val else sub.upper())
            else:
                result.append(sub)
    return "-".join(result) if result else None


def normalize_standard_number(raw: str) -> NormalizedStandard:
    """Parse any observed raw ``standard_number`` string into canonical form.

    Never raises on malformed input -- unparsable fields simply come back
    as ``is_number=None`` so callers can flag the row for review instead of
    crashing a batch job.
    """
    if raw is None:
        return NormalizedStandard("", None, None, None, "IS")

    s = str(raw).strip()
    m = _PREFIX_RE.match(s)
    if m:
        prefix = "IS/ISO" if m.group(1).upper() == "IS/ISO" else "IS"
        rest = m.group(2)
    else:
        prefix = "IS"
        rest = s

    num_m = re.search(r"\d+", rest)
    is_number = int(num_m.group()) if num_m else None
    rest_after_num = rest[num_m.end():] if num_m else rest

    part = None
    paren_m = _PAREN_RE.search(rest_after_num)
    if paren_m:
        part = _parse_part(paren_m.group(1))
        rest_after_num = rest_after_num[: paren_m.start()] + rest_after_num[paren_m.end():]

    nums = re.findall(r"\d+", rest_after_num)
    year = None
    year_candidates = [n for n in nums if _YEAR_RE.fullmatch(n)]
    if year_candidates:
        year = int(year_candidates[-1])
    remaining = [n for n in nums if n not in year_candidates]
    if part is None and remaining:
        part = "-".join(remaining)

    canonical = f"{prefix} {is_number}" if is_number is not None else prefix
    if part:
        canonical += f"-{part}"
    if year:
        canonical += f":{year}"

    return NormalizedStandard(canonical, is_number, part, year, prefix)


def demo() -> None:
    """Smoke-test against every raw pattern observed in the two data files."""
    cases = {
        "IS 456": ("IS 456", 456, None, None),
        "IS 12269-1987": ("IS 12269:1987", 12269, None, 1987),
        "IS: 2386": ("IS 2386", 2386, None, None),
        "IS 269 - 2015": ("IS 269:2015", 269, None, 2015),
        "IS:2720 (Part.4) 1985": ("IS 2720-4:1985", 2720, "4", 1985),
        "IS 12448-2-3": ("IS 12448-2-3", 12448, "2-3", None),
        "IS 3160 : 2022": ("IS 3160:2022", 3160, None, 2022),
        "IS 26002 :": ("IS 26002", 26002, None, None),
        "IS 1489 (part 1&2) 1991": ("IS 1489-1-2:1991", 1489, "1-2", 1991),
        "IS 2386 (Part I) 1963": ("IS 2386-1:1963", 2386, "1", 1963),
        "IS 3495 (Parts I TO iv) 1976": ("IS 3495-1-4:1976", 3495, "1-4", 1976),
        "IS 432 (P II) 1966": ("IS 432-2:1966", 432, "2", 1966),
        "IS:2720(Part. XI) 1971": ("IS 2720-11:1971", 2720, "11", 1971),
        "IS:1498 1970": ("IS 1498:1970", 1498, None, 1970),
        "IS 13270:2013": ("IS 13270:2013", 13270, None, 2013),
        "IS 3156 (Part 1):1992": ("IS 3156-1:1992", 3156, "1", 1992),
        "IS 4031 (Relevant Parts)": ("IS 4031", 4031, None, None),
        "IS 302-1:2008": ("IS 302-1:2008", 302, "1", 2008),
        "IS 302-2-14:2009": ("IS 302-2-14:2009", 302, "2-14", 2009),
        "IS/ISO 14971:2019": ("IS/ISO 14971:2019", 14971, None, 2019),
        "IS 2303 (Part 1/Sec 1):1994": ("IS 2303-1-1:1994", 2303, "1-1", 1994),
    }
    failures = []
    for raw, (exp_canon, exp_num, exp_part, exp_year) in cases.items():
        result = normalize_standard_number(raw)
        if (result.standard_number, result.is_number, result.part, result.year) != (
            exp_canon, exp_num, exp_part, exp_year,
        ):
            failures.append((raw, result, (exp_canon, exp_num, exp_part, exp_year)))

    if failures:
        for raw, got, exp in failures:
            print(f"FAIL {raw!r}: got {got} expected {exp}")
        raise SystemExit(f"{len(failures)}/{len(cases)} cases failed")
    print(f"OK: {len(cases)} patterns normalized correctly")


if __name__ == "__main__":
    demo()
