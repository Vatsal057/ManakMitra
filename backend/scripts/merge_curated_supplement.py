"""Merge data/curated_standards_supplement.json into bis_standards_clean.csv/.json.

Run after src/data_pipeline/clean.py (which applies the certification_map.json
overlay). Reuses the existing pipeline functions -- normalize_standard_number,
category_rules (via clean._resolve_category), certification_rules.classify,
clean._resolve_year / _resolve_latest_version -- for every merged and new
row, per the prompt's "no shortcuts for this batch" instruction.

Decision rule for overlaps (base number + part collision with an existing
row), applied identically to every case including the file's own worked
example (IS 1786): if the existing row is already scope_usable == True, it
already has real, usable scope text -- keep it and log the conflict rather
than overwriting a verified row with an unfamiliar one. Only overwrite when
the existing row is NOT scope_usable (title_fallback or otherwise thin).

Certification is deliberately NOT taken from the supplement's own
certification_type field (which includes a literal "None" that this
project's tri-state contract forbids ever serializing -- see
certification_rules.py's own docstring: "this module never [asserts None]
-- we have not surveyed the negative space"). Every row's certification
continues to come from certification_rules.classify(), which already covers
the certification_map.json overlay run in clean.py.
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from data_pipeline.normalize import normalize_standard_number
from data_pipeline import certification_rules
from data_pipeline.clean import (
    _resolve_category,
    _resolve_year,
    _resolve_latest_version,
    MIN_SCOPE_WORDS,
)

CSV_PATH = ROOT / "data" / "bis_standards_clean.csv"
JSON_PATH = ROOT / "data" / "bis_standards_clean.json"
SUPPLEMENT_PATH = ROOT / "data" / "source" / "curated_standards_supplement.json"


def _resolve_curated_scope(title: str, scope_description: str, has_verified_reference: bool) -> tuple[str, str, bool, list[str]]:
    """Curated-row equivalent of clean._resolve_scope -- these rows were
    hand-written, not scraped, so scope_source reflects that provenance
    (drafted vs curated_verified) instead of scraped/title_fallback."""
    reasons = []
    scope_source = "curated_verified" if has_verified_reference else "drafted"
    is_real_text = scope_description.strip().lower() != title.strip().lower()
    if not is_real_text:
        reasons.append("scope_equals_title")
    scope_wc = len(scope_description.split())
    if scope_wc < MIN_SCOPE_WORDS:
        reasons.append(f"scope_too_short ({scope_wc} words)")
    scope_usable = is_real_text and scope_wc >= MIN_SCOPE_WORDS
    return scope_description, scope_source, scope_usable, reasons


def _build_curated_fields(sup: dict, is_number: int, part: str | None, prefix: str) -> dict:
    title = sup["title"].strip()
    review_reasons: list[str] = []

    scope_description, scope_source, scope_usable, scope_reasons = _resolve_curated_scope(
        title, sup["scope_description"], bool(sup.get("verified_reference"))
    )
    review_reasons += scope_reasons

    year, year_reasons = _resolve_year(is_number, sup.get("year"), {})
    review_reasons += year_reasons

    category, category_note, category_reasons = _resolve_category(is_number, title, sup.get("category"))
    review_reasons += category_reasons

    latest_version, version_source = _resolve_latest_version(is_number, part, year, prefix)

    cert = certification_rules.classify(is_number, part)
    if cert.certification_type == "Not determined":
        review_reasons.append("certification_not_determined")

    source_url = sup.get("verified_reference")
    if source_url is None:
        review_reasons.append("missing_source_url")

    is_blocker = not scope_usable or category == "Uncategorized" or year is None
    if is_blocker:
        review_severity = "blocker"
    elif cert.certification_type == "Not determined" or source_url is None:
        review_severity = "minor"
    else:
        review_severity = "none"

    return {
        # standard_number / standard_number_raw are set by the caller from
        # normalize_standard_number's output, not computed here.
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
        "confidence": sup.get("source_confidence", "medium"),
        "review_severity": review_severity,
        "review_reason": ";".join(review_reasons),
        "amendment_count": sup.get("amendments"),
        "source": sup.get("source", "curated_task3"),
    }


def main() -> None:
    with open(CSV_PATH, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    fieldnames = list(rows[0].keys())

    def key_of(row_is_number, row_part):
        part = None if row_part in (None, "", "nan") else str(row_part)
        return (int(row_is_number), part)

    index: dict[tuple[int, str | None], dict] = {}
    for r in rows:
        if r["is_number"] and r["is_number"] != "":
            index[key_of(r["is_number"], r["part"])] = r

    supplement = json.loads(SUPPLEMENT_PATH.read_text(encoding="utf-8"))["standards"]

    kept_existing = []
    overwritten = []
    appended = []

    for sup in supplement:
        norm = normalize_standard_number(sup["standard_number"])
        key = (norm.is_number, norm.part)
        existing = index.get(key)

        if existing is not None:
            if str(existing.get("scope_usable")).lower() == "true":
                kept_existing.append({
                    "standard_number": existing["standard_number"],
                    "existing_scope_source": existing["scope_source"],
                    "existing_year": existing["year_published"],
                    "supplement_year": sup.get("year"),
                    "supplement_confidence": sup.get("source_confidence"),
                })
                continue
            # Supplement wins: rebuild this row's fields in place.
            new_fields = _build_curated_fields(sup, norm.is_number, norm.part, norm.prefix)
            new_fields["standard_number"] = norm.standard_number
            new_fields["standard_number_raw"] = sup["standard_number"]
            old_scope_source = existing["scope_source"]
            existing.update(new_fields)
            overwritten.append({
                "standard_number": norm.standard_number,
                "old_scope_source": old_scope_source,
                "new_scope_source": new_fields["scope_source"],
            })
        else:
            new_fields = _build_curated_fields(sup, norm.is_number, norm.part, norm.prefix)
            new_fields["standard_number"] = norm.standard_number
            new_fields["standard_number_raw"] = sup["standard_number"]
            rows.append(new_fields)
            index[key] = new_fields
            appended.append(norm.standard_number)

    # Duplicate-standard_number check, mirroring clean.py's own guard.
    dup_numbers: dict[str, list[dict]] = {}
    for r in rows:
        dup_numbers.setdefault(r["standard_number"], []).append(r)
    for canon, group in dup_numbers.items():
        if len(group) > 1:
            for r in group:
                reasons = set(r["review_reason"].split(";")) if r.get("review_reason") else set()
                reasons.add("duplicate_standard_number")
                r["review_reason"] = ";".join(sorted(x for x in reasons if x))
                r["review_severity"] = "blocker"

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    JSON_PATH.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Curated supplement: {len(supplement)} rows processed")
    print(f"  kept existing (already scope_usable, conflict logged): {len(kept_existing)}")
    for c in kept_existing:
        print(f"    - {c['standard_number']}: existing {c['existing_scope_source']} ({c['existing_year']}) "
              f"kept over supplement {c['supplement_year']} (confidence={c['supplement_confidence']})")
    print(f"  overwrote (existing was not scope_usable): {len(overwritten)}")
    for o in overwritten:
        print(f"    - {o['standard_number']}: {o['old_scope_source']} -> {o['new_scope_source']}")
    print(f"  appended as new rows: {len(appended)}")
    for a in appended:
        print(f"    - {a}")
    print(f"\nTotal corpus rows: {len(rows)}")


if __name__ == "__main__":
    main()
