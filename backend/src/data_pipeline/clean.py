"""Build the cleaned ManakMitra dataset (target schema) from the raw scrape.

Run order: this reads the raw CSV + allied mapping + the archive.org scrape
cache produced by scripts/scrape_scopes.py, and writes
data/bis_standards_clean.csv/.json and
data/allied_standards_mapping_normalized.json. It never modifies the raw
inputs.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from data_pipeline.normalize import normalize_standard_number
from data_pipeline import category_rules, certification_rules

RAW_CSV = ROOT / "data" / "raw" / "bis_standards_dataset.csv"
ALLIED_JSON = ROOT / "data" / "raw" / "allied_standards_mapping.json"
SCOPE_CACHE = ROOT / "data" / "cache" / "scope_results.json"
OUT_CSV = ROOT / "data" / "bis_standards_clean.csv"
OUT_JSON = ROOT / "data" / "bis_standards_clean.json"
OUT_ALLIED_JSON = ROOT / "data" / "allied_standards_mapping_normalized.json"

# Two corrupted years diagnosed by the audit (IS: 432 had year 2062; the row
# for IS: 2090 had its own standard number leak into the year field).
# Corrected values cross-checked independently against archive.org scan
# identifiers gov.in.is.432.{1,2}.1982 and gov.in.is.2090.1983.
_YEAR_CORRECTIONS = {
    432: 1982,
    2090: 1983,
}

MIN_SCOPE_WORDS = 15
MIN_YEAR, MAX_YEAR = 1950, 2026

_AMEND_RE = re.compile(r"Amendments:\s*(\d+)", re.IGNORECASE)


def _load_scope_cache() -> dict:
    if SCOPE_CACHE.exists():
        return json.loads(SCOPE_CACHE.read_text(encoding="utf-8"))
    return {}


def _parse_amendment_count(raw: str) -> Optional[int]:
    if not raw:
        return None
    m = _AMEND_RE.search(raw)
    return int(m.group(1)) if m else None


def _parse_year(raw: str) -> Optional[int]:
    if not raw:
        return None
    try:
        return int(float(raw))
    except ValueError:
        return None


def _resolve_scope(is_number: Optional[int], title: str, raw_scope: Optional[str], scraped: dict) -> tuple[str, str, list[str]]:
    reasons = []
    scope_text = scraped.get("scope_text")
    if scope_text:
        # A scrape "hit" isn't automatically usable -- some pages extract a
        # near-empty clause. Flag it the same way a title-fallback would be,
        # rather than letting scope_source == "scraped" mask a thin result.
        scope_wc = len(scope_text.split())
        if scope_wc < MIN_SCOPE_WORDS:
            reasons.append(f"scope_too_short ({scope_wc} words)")
        return scope_text, "scraped", reasons

    scope_description = (raw_scope or title).strip()
    if scope_description.lower() == title.strip().lower():
        reasons.append("scope_equals_title")
    scope_wc = len(scope_description.split())
    if scope_wc < MIN_SCOPE_WORDS:
        reasons.append(f"scope_too_short ({scope_wc} words)")
    return scope_description, "title_fallback", reasons


def _resolve_year(is_number: Optional[int], raw_year: Optional[int], scraped: dict) -> tuple[Optional[int], list[str]]:
    reasons = []
    if is_number in _YEAR_CORRECTIONS:
        return _YEAR_CORRECTIONS[is_number], reasons

    year = raw_year
    if year is not None and not (MIN_YEAR <= year <= MAX_YEAR):
        reasons.append("year_unverified")
        year = None
    if year is None and scraped.get("year"):
        year = scraped["year"]
    if year is None:
        reasons.append("missing_year")
    return year, reasons


def _resolve_category(is_number: Optional[int], title: str, raw_category: Optional[str]) -> tuple[str, Optional[str], list[str]]:
    correction = category_rules.hard_override(is_number)
    if correction:
        return correction, "medium (manual correction, see category_rules.py)", []

    category = (raw_category or "").strip()
    if category and category != "Uncategorized":
        return category, None, []

    inferred, reason = category_rules.classify(is_number, title)
    if inferred:
        return inferred, f"medium ({reason})", []
    return "Uncategorized", None, ["category_unresolved"]


def _resolve_latest_version(is_number: Optional[int], part: Optional[str], year: Optional[int],
                             prefix: str = "IS") -> tuple[Optional[str], str]:
    """Derive latest_version from the canonical number + known year.

    This states the published edition on record, e.g. "IS 456:2000" --
    never a claim about currency or the existence of a later revision.
    """
    if year is None or is_number is None:
        return None, "not_derivable"
    canonical = f"{prefix} {is_number}"
    if part:
        canonical += f"-{part}"
    canonical += f":{year}"
    return canonical, "derived_from_year"


def _build_common_fields(is_number: Optional[int], part: Optional[str], title: str,
                          raw_category: Optional[str], raw_year: Optional[int],
                          raw_scope: Optional[str], scope_cache: dict,
                          prefix: str = "IS") -> dict:
    """Fields shared by both the main-dataset rows and the ingested-allied
    rows: scope resolution, category, year, latest_version, certification,
    and the review bookkeeping built from all of the above."""
    scraped = scope_cache.get(str(is_number), {}) if is_number is not None else {}
    review_reasons: list[str] = []

    scope_description, scope_source, scope_reasons = _resolve_scope(is_number, title, raw_scope, scraped)
    review_reasons += scope_reasons

    year, year_reasons = _resolve_year(is_number, raw_year, scraped)
    review_reasons += year_reasons

    category, category_note, category_reasons = _resolve_category(is_number, title, raw_category)
    review_reasons += category_reasons

    latest_version, version_source = _resolve_latest_version(is_number, part, year, prefix)

    cert = certification_rules.classify(is_number, part)
    if cert.certification_type == "Not determined":
        review_reasons.append("certification_not_determined")

    source_url = f"https://archive.org/details/{scraped['identifier']}" if scraped.get("identifier") else None
    if source_url is None:
        review_reasons.append("missing_source_url")

    scope_usable = scope_source == "scraped" and len(scope_description.split()) >= MIN_SCOPE_WORDS

    confidence = "low"
    if scope_source == "scraped":
        confidence = "medium" if (category_note or cert.confidence == "low" or not scope_usable) else "high"

    is_blocker = (
        not scope_usable
        or category == "Uncategorized"
        or year is None
    )
    if is_blocker:
        review_severity = "blocker"
    elif (
        cert.certification_type == "Not determined"
        or source_url is None
    ):
        review_severity = "minor"
    else:
        review_severity = "none"

    return {
        "is_number": is_number,
        "part": part,
        "title": title,
        "scope_description": scope_description,
        "scope_source": scope_source,
        "scope_usable": scope_usable,
        "category": category,
        "latest_version": latest_version,
        "version_source": version_source,
        "year_published": year,
        "certification_type": cert.certification_type,
        "mandatory": cert.mandatory,
        "certification_source": cert.certification_source,
        "qco_reference": cert.qco_reference,
        "certification_basis": cert.basis,
        "certification_reference": cert.reference,
        "source_url": source_url,
        "confidence": confidence,
        "review_severity": review_severity,
        "review_reason": review_reasons,  # joined to a string by the caller once amendment_count is known
        "scraped_identifier": scraped.get("identifier"),
    }


def clean_main_dataset() -> list[dict]:
    scope_cache = _load_scope_cache()

    with open(RAW_CSV, encoding="utf-8") as f:
        raw_rows = list(csv.DictReader(f))

    out_rows = []
    for row in raw_rows:
        norm = normalize_standard_number(row["standard_number"])
        title = row["title"].strip()
        raw_year = _parse_year(row["year_published"])

        common = _build_common_fields(
            norm.is_number, norm.part, title,
            row["category"], raw_year, row["scope_description"], scope_cache,
            prefix=norm.prefix,
        )

        amendment_count = _parse_amendment_count(row["latest_version"])
        review_reasons = common.pop("review_reason")
        if amendment_count is None:
            review_reasons.append("missing_amendment_count")
            if common["review_severity"] == "none":
                common["review_severity"] = "minor"

        scraped_identifier = common.pop("scraped_identifier")
        out_rows.append({
            "standard_number": norm.standard_number,
            "standard_number_raw": row["standard_number"],
            **common,
            "amendment_count": amendment_count,
            "source": row["source"] + (";archive_org_scope" if scraped_identifier else ""),
            "review_reason": ";".join(review_reasons),
        })

    return out_rows


def annotate_allied_mapping() -> list[dict]:
    """Normalize the allied mapping's standard numbers in place."""
    data = json.loads(ALLIED_JSON.read_text(encoding="utf-8"))
    for entry in data:
        p = normalize_standard_number(entry["primary_standard"])
        entry["primary_standard_normalized"] = p.standard_number
        entry["primary_is_number"] = p.is_number
        entry["primary_part"] = p.part
        for allied in entry["allied_standards"]:
            a = normalize_standard_number(allied["standard"])
            allied["standard_normalized"] = a.standard_number
            allied["is_number"] = a.is_number
    return data


def find_unresolved(allied_data: list[dict], known_is_numbers: set[int]) -> list[dict]:
    """Allied references that still don't resolve against `known_is_numbers`."""
    unresolved = []
    for entry in allied_data:
        for allied in entry["allied_standards"]:
            if allied["is_number"] not in known_is_numbers:
                unresolved.append({
                    "is_number": allied["is_number"],
                    "standard": allied["standard"],
                    "title": allied["title"],
                })
    return unresolved


def build_missing_standard_rows(allied_data: list[dict], main_is_numbers: set[int]) -> list[dict]:
    """First-class rows for allied references with no row in the main dataset.

    Titles come straight from the allied mapping's own `title` field (real
    data already on disk, not scraped or invented).
    """
    scope_cache = _load_scope_cache()
    seen = set()
    rows = []
    for entry in allied_data:
        for allied in entry["allied_standards"]:
            is_num = allied["is_number"]
            if is_num is None or is_num in main_is_numbers or is_num in seen:
                continue
            seen.add(is_num)

            title = allied["title"].strip()
            allied_norm = normalize_standard_number(allied["standard"])
            common = _build_common_fields(
                is_num, allied_norm.part, title, None, None, None, scope_cache,
                prefix=allied_norm.prefix,
            )

            review_reasons = common.pop("review_reason")
            review_reasons.insert(0, "ingested_from_allied_mapping")
            review_reasons.append("missing_amendment_count")
            if common["review_severity"] == "none":
                common["review_severity"] = "minor"

            scraped_identifier = common.pop("scraped_identifier")
            rows.append({
                "standard_number": allied["standard_normalized"],
                "standard_number_raw": allied["standard"],
                **common,
                "amendment_count": None,
                "source": "allied_standards_mapping" + (";archive_org_scope" if scraped_identifier else ""),
                "review_reason": ";".join(review_reasons),
            })
    return rows


def main() -> None:
    main_rows = clean_main_dataset()
    main_is_numbers = {r["is_number"] for r in main_rows if r["is_number"] is not None}

    allied_data = annotate_allied_mapping()
    missing_rows = build_missing_standard_rows(allied_data, main_is_numbers)

    all_rows = main_rows + missing_rows
    all_is_numbers = {r["is_number"] for r in all_rows if r["is_number"] is not None}
    unresolved = find_unresolved(allied_data, all_is_numbers)

    dup_numbers: dict[str, list[dict]] = {}
    for r in all_rows:
        dup_numbers.setdefault(r["standard_number"], []).append(r)
    for canon, group in dup_numbers.items():
        if len(group) > 1:
            for r in group:
                reasons = set(r["review_reason"].split(";")) if r["review_reason"] else set()
                reasons.add("duplicate_standard_number")
                r["review_reason"] = ";".join(sorted(x for x in reasons if x))
                r["review_severity"] = "blocker"

    OUT_JSON.write_text(json.dumps(all_rows, indent=2, ensure_ascii=False), encoding="utf-8")
    fieldnames = list(all_rows[0].keys())
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    OUT_ALLIED_JSON.write_text(json.dumps(allied_data, indent=2, ensure_ascii=False), encoding="utf-8")

    # Match on (is_number, part) so a primary like "IS 302-2-3" (electric
    # irons) doesn't pull in unrelated sibling parts of the same base
    # number (e.g. IS 302-2-32, massage appliances) into the demo spine.
    demo_spine_keys = {(e["primary_is_number"], e["primary_part"]) for e in allied_data}
    demo_spine_rows = [r for r in all_rows if (r["is_number"], r["part"]) in demo_spine_keys]

    print(f"Wrote {len(all_rows)} rows ({len(main_rows)} main + {len(missing_rows)} ingested-from-allied)")
    print(f"Demo-spine rows (primary standards): {len(demo_spine_rows)}")
    print(f"Allied references still unresolved after ingestion: {len(unresolved)}")
    scoped = sum(1 for r in all_rows if r["scope_source"] == "scraped")
    print(f"Real scraped scope text: {scoped}/{len(all_rows)}")

    print("\nreview_severity (whole corpus):", dict(Counter(r["review_severity"] for r in all_rows)))
    print("review_severity (demo-spine):  ", dict(Counter(r["review_severity"] for r in demo_spine_rows)))
    print("\ncategory == Uncategorized (whole corpus):", sum(1 for r in all_rows if r["category"] == "Uncategorized"))
    print("category == Uncategorized (demo-spine):  ", sum(1 for r in demo_spine_rows if r["category"] == "Uncategorized"))


if __name__ == "__main__":
    main()
