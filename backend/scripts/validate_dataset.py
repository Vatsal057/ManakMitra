"""Validate data/bis_standards_clean.csv + allied_standards_mapping_normalized.json,
and print a before/after comparison against the audit's baseline numbers,
with demo-spine (the 45 primary standards) broken out separately from the
whole corpus throughout -- whole-corpus coverage is the honest figure for
the deck, but spine coverage is what determines whether the live demo holds up.
"""
from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CLEAN_CSV = ROOT / "data" / "bis_standards_clean.csv"
RAW_CSV = ROOT / "data" / "raw" / "bis_standards_dataset.csv"
ALLIED_NORMALIZED = ROOT / "data" / "allied_standards_mapping_normalized.json"

MIN_YEAR, MAX_YEAR = 1950, 2026
READY_MIN_SCOPE_WORDS = 15


def load_rows(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _int_or_none(v: str):
    return int(float(v)) if v else None


def main() -> None:
    if not CLEAN_CSV.exists():
        sys.exit(f"missing {CLEAN_CSV} -- run src/data_pipeline/clean.py first")

    rows = load_rows(CLEAN_CSV)
    raw_rows = load_rows(RAW_CSV)
    allied_data = json.loads(ALLIED_NORMALIZED.read_text(encoding="utf-8"))

    for r in rows:
        r["is_number"] = _int_or_none(r["is_number"])
        r["year_published"] = _int_or_none(r["year_published"])

    demo_spine_keys = {(e["primary_is_number"], e["primary_part"]) for e in allied_data}
    spine_rows = [r for r in rows if (r["is_number"], r["part"] or None) in demo_spine_keys]

    failures = []

    # 1. every primary_standard resolves
    clean_is_numbers = {r["is_number"] for r in rows if r["is_number"] is not None}
    unresolved_primary = [
        e["primary_standard"] for e in allied_data
        if e.get("primary_is_number") not in clean_is_numbers
    ]
    if unresolved_primary:
        failures.append(f"{len(unresolved_primary)} primary_standard entries unresolved: {unresolved_primary}")

    # 2. allied standard refs resolve (report remaining unresolved count, not a hard failure)
    total_allied = 0
    unresolved_allied = 0
    for e in allied_data:
        for a in e["allied_standards"]:
            total_allied += 1
            if a.get("is_number") not in clean_is_numbers:
                unresolved_allied += 1

    # 3. year bounds
    bad_years = [r["standard_number"] for r in rows if r["year_published"] and not (MIN_YEAR <= r["year_published"] <= MAX_YEAR)]
    if bad_years:
        failures.append(f"{len(bad_years)} rows with year_published outside {MIN_YEAR}-{MAX_YEAR}: {bad_years}")

    # 4. no duplicate standard_number
    counts = Counter(r["standard_number"] for r in rows)
    dupes = [k for k, v in counts.items() if v > 1]
    if dupes:
        failures.append(f"{len(dupes)} duplicate standard_number values: {dupes}")

    # 5. certification_type == 'None' must carry a certification_source (never
    # a bare, unsourced negative). We never actually assert "None" in this
    # pipeline -- everything unassessed is "Not determined" -- so this
    # should hold trivially, but a future certification pass could violate
    # it if someone starts setting "None" without recording why.
    bad_none_cert = [
        r["standard_number"] for r in rows
        if r["certification_type"] == "None" and r["certification_source"] in ("", "not_assessed")
    ]
    if bad_none_cert:
        failures.append(f"{len(bad_none_cert)} rows have certification_type='None' with no certification_source basis: {bad_none_cert}")

    # 6. mandatory must never be False where certification_source == 'not_assessed'
    #    ('' / 'not_assessed' in the CSV both mean "we didn't set it")
    bad_mandatory = [
        r["standard_number"] for r in rows
        if r["mandatory"] == "False" and r["certification_source"] in ("", "not_assessed")
    ]
    if bad_mandatory:
        failures.append(f"{len(bad_mandatory)} rows have mandatory=False on an unassessed row: {bad_mandatory}")

    # 7. latest_version non-null wherever year_published is non-null
    missing_latest_version = [
        r["standard_number"] for r in rows
        if r["year_published"] is not None and not r["latest_version"]
    ]
    if missing_latest_version:
        failures.append(f"{len(missing_latest_version)} rows have year_published but no derived latest_version: {missing_latest_version}")

    # --- coverage report, whole corpus vs demo spine ---
    def scope_dup(r):
        return r["scope_description"].strip().lower() == r["title"].strip().lower()

    def is_ready(r):
        return (
            r["scope_usable"] == "True"
            and r["category"] not in ("Uncategorized", "")
            and r["year_published"] is not None
            and r["certification_type"] != "Not determined"
        )

    raw_dup_scope = sum(1 for r in raw_rows if r["scope_description"].strip().lower() == r["title"].strip().lower())
    raw_uncategorized = sum(1 for r in raw_rows if r["category"] == "Uncategorized")
    raw_missing_year = sum(1 for r in raw_rows if not r["year_published"])

    def report(label: str, rowset: list[dict]) -> None:
        n = len(rowset)
        print(f"-- {label} (n={n}) --")
        print(f"  scope == title (dup):      {sum(1 for r in rowset if scope_dup(r)):4d} / {n}")
        print(f"  Uncategorized:             {sum(1 for r in rowset if r['category'] == 'Uncategorized'):4d} / {n}")
        print(f"  missing year:              {sum(1 for r in rowset if r['year_published'] is None):4d} / {n}")
        print(f"  missing latest_version:    {sum(1 for r in rowset if not r['latest_version']):4d} / {n}")
        print(f"  certification determined:  {sum(1 for r in rowset if r['certification_type'] != 'Not determined'):4d} / {n}")
        print(f"  qco_reference populated:   {sum(1 for r in rowset if r['qco_reference']):4d} / {n}")
        sev = Counter(r["review_severity"] for r in rowset)
        print(f"  review_severity:           blocker={sev.get('blocker', 0)}  minor={sev.get('minor', 0)}  none={sev.get('none', 0)}")
        scope_dist = Counter(r["scope_source"] for r in rowset)
        print(f"  scope_source:              scraped={scope_dist.get('scraped', 0)}  title_fallback={scope_dist.get('title_fallback', 0)}")
        print(f"  scope_usable (>=15w, scraped): {sum(1 for r in rowset if r['scope_usable'] == 'True'):4d} / {n}")
        print(f"  ready for embedding:       {sum(1 for r in rowset if is_ready(r)):4d} / {n}")
        print()

    print("=" * 72)
    print(f"BEFORE (raw, {len(raw_rows)} records)")
    print("=" * 72)
    print(f"  scope == title (dup): {raw_dup_scope} / {len(raw_rows)}   Uncategorized: {raw_uncategorized}   missing year: {raw_missing_year}")
    print(f"  (no certification_type, latest_version, or review_severity column existed)")
    print()
    print("=" * 72)
    print("AFTER (clean) -- whole corpus vs. demo spine")
    print("=" * 72)
    report("Whole corpus", rows)
    report(f"Demo spine ({len(spine_rows)} of {len(allied_data)} primary standards -- see note in ENRICHMENT_REPORT.md)", spine_rows)

    print("Allied mapping join:")
    print(f"  primary_standard resolved:  {len(allied_data) - len(unresolved_primary)}/{len(allied_data)}")
    print(f"  allied refs resolved:       {total_allied - unresolved_allied}/{total_allied} "
          f"(was 66/142 before enrichment per audit baseline)")
    print()

    if failures:
        print("HARD FAILURES:")
        for f_ in failures:
            print(" -", f_)
        sys.exit(1)
    else:
        print("All hard validation checks passed.")


if __name__ == "__main__":
    main()
