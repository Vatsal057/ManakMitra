"""Run the archive.org scope scraper over the full dataset + missing allied
standards, caching results to data/cache/scope_results.json.

This is a standalone step (not part of clean.py's import graph) so that a
slow scraping pass can be re-run independently of the fast mechanical
cleaning pipeline. clean.py reads its cached output.
"""
from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from data_pipeline.normalize import normalize_standard_number
from data_pipeline.scrape import archive_org as ao

OUT_PATH = ROOT / "data" / "cache" / "scope_results.json"


def _build_targets() -> dict[int, dict]:
    targets = {}  # is_number -> {part, year}

    with open(ROOT / "data" / "raw" / "bis_standards_dataset.csv", encoding="utf-8") as f:
        main_rows = list(csv.DictReader(f))
    main_is_numbers = set()
    for row in main_rows:
        n = normalize_standard_number(row["standard_number"])
        if n.is_number is None:
            continue
        main_is_numbers.add(n.is_number)
        year = int(float(row["year_published"])) if row["year_published"] else None
        targets.setdefault(n.is_number, {"part": n.part, "year": year})

    with open(ROOT / "data" / "raw" / "allied_standards_mapping.json", encoding="utf-8") as f:
        mapping = json.load(f)
    for entry in mapping:
        for allied in entry["allied_standards"]:
            n = normalize_standard_number(allied["standard"])
            if n.is_number is None:
                continue
            targets.setdefault(n.is_number, {"part": n.part, "year": None})

    primary_is_numbers = {
        normalize_standard_number(entry["primary_standard"]).is_number for entry in mapping
    }
    ingested_is_numbers = {
        normalize_standard_number(allied["standard"]).is_number
        for entry in mapping
        for allied in entry["allied_standards"]
    } - main_is_numbers

    def priority(is_number: int) -> int:
        if is_number in primary_is_numbers:
            return 0
        if is_number in ingested_is_numbers:
            return 1
        return 2

    for is_number, info in targets.items():
        info["priority"] = priority(is_number)

    return targets


def main() -> None:
    targets = _build_targets()
    tier_counts = Counter(info["priority"] for info in targets.values())
    print(f"{len(targets)} unique IS numbers to look up "
          f"(tier0 primary={tier_counts[0]}, tier1 ingested-allied={tier_counts[1]}, tier2 rest={tier_counts[2]})",
          flush=True)

    results = {}
    if OUT_PATH.exists():
        results = json.loads(OUT_PATH.read_text(encoding="utf-8"))

    ordered = sorted(targets.items(), key=lambda kv: (kv[1]["priority"], kv[0]))
    remaining = [(n, info) for n, info in ordered if str(n) not in results]
    print(f"{len(results)} already cached, {len(remaining)} left to fetch", flush=True)

    for i, (is_number, info) in enumerate(remaining):
        key = str(is_number)
        r = ao.get_scope_and_year(is_number, info["part"], info["year"])
        results[key] = r
        status = "scope+year" if r["scope_text"] else ("year-only" if r["identifier"] else "miss")
        print(f"[{i+1}/{len(remaining)}] IS {is_number} (tier{info['priority']}): {status} ({r['identifier']})", flush=True)
        if (i + 1) % 10 == 0:
            OUT_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")

    OUT_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")
    hits = sum(1 for r in results.values() if r["scope_text"])
    print(f"\nDone. {hits}/{len(results)} standards yielded real scope text.", flush=True)


if __name__ == "__main__":
    main()
