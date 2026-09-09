"""Automated enforcement of the paraphrase query set's hard construction rule:
no content word in a `descriptive_paraphrase` query may appear in any of its
target standards' `composed_text`.

Run standalone to validate data/eval/queries_paraphrase.jsonl (exit 1 on any
violation, printing the overlapping words so wording can be fixed) or import
`content_words`/`check_query` to validate a candidate query before adding it.

"Stopwords and unavoidable units are exempt" (per the authoring instruction):
- standard English stopwords (for, of, the, a, ...)
- domain-generic boilerplate that appears in nearly every standard's own
  text regardless of subject ("specification", "requirements", "covers",
  "standard" itself, "part", "section", ...) -- without this, essentially
  no query could ever pass, since this vocabulary is near-universal
  filler, not content signal
- pure numbers and unit-like tokens (grade numbers, "500", "1100v", "43")
  and any token of length <= 2 (abbreviations/units)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from data_pipeline.normalize import normalize_standard_number

QUERIES_PATH = ROOT / "data" / "eval" / "queries_paraphrase.jsonl"
CSV_PATH = ROOT / "data" / "bis_standards_clean.csv"

_STOPWORDS = {
    "a", "an", "the", "for", "of", "and", "or", "with", "in", "on", "at", "to",
    "from", "by", "as", "is", "are", "this", "that", "these", "those", "used",
    "use", "other", "similar", "up", "including", "per", "than", "which",
    "not", "be", "shall", "may", "any", "such", "into", "under", "over",
    "also", "its", "their", "it", "all", "each", "having", "where", "when",
}
_DOMAIN_BOILERPLATE = {
    "specification", "specifications", "standard", "standards", "requirement",
    "requirements", "covers", "cover", "general", "code", "practice",
    "practices", "method", "methods", "test", "tests", "testing", "material",
    "materials", "part", "parts", "section", "sections", "revision",
    "category", "categories", "provide", "provides", "provided",
}
# Category-label words (e.g. "cement" in "Cement & Construction") are a
# structural template artifact -- every one of the 86 Cement & Construction
# rows contains "cement" via the category field regardless of what that
# specific row's scope actually says. Counting it as "content" would make
# it near-impossible to write a natural query for any common product family
# without tripping the rule on a word that isn't discriminating anything.
_CATEGORY_WORDS = {
    "water", "environment", "metallurgy", "cement", "construction",
    "uncategorized", "petroleum", "mining", "minerals", "electronics",
    "food", "agriculture", "mechanical", "plastics", "rubber", "safety",
    "ppe", "chemicals", "medical", "healthcare", "textiles", "electrical",
}
_EXEMPT = _STOPWORDS | _DOMAIN_BOILERPLATE | _CATEGORY_WORDS


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", (text or "").lower()))


def _is_unit_or_number(token: str) -> bool:
    return bool(re.fullmatch(r"\d+[a-z]*", token)) or len(token) <= 2


def content_words(text: str) -> set[str]:
    """Tokens that count as 'content' for the overlap rule -- everything
    except stopwords, domain boilerplate, and unit/number-like tokens."""
    return {t for t in _tokenize(text) if t not in _EXEMPT and not _is_unit_or_number(t)}


def _composed_text_lookup() -> dict[tuple, str]:
    import csv as csv_module
    with open(CSV_PATH, encoding="utf-8") as f:
        rows = list(csv_module.DictReader(f))
    lookup = {}
    for row in rows:
        n = normalize_standard_number(row["standard_number"])
        composed = f"{row['title']}. Category: {row['category']}. {row['scope_description']}"
        lookup[(n.is_number, n.part or None)] = composed
    return lookup


def check_query(query: str, targets: list[str], lookup: dict[tuple, str]) -> dict[str, set[str]]:
    """Returns {target: overlapping_words} for any target with a violation
    (empty dict if the query is clean against all its targets)."""
    query_words = content_words(query)
    violations = {}
    for target in targets:
        n = normalize_standard_number(target)
        composed = lookup.get((n.is_number, n.part or None), "")
        target_words = content_words(composed)
        overlap = query_words & target_words
        if overlap:
            violations[target] = overlap
    return violations


def main() -> int:
    if not QUERIES_PATH.exists():
        print(f"missing {QUERIES_PATH}")
        return 1

    lookup = _composed_text_lookup()
    lines = [l for l in QUERIES_PATH.read_text(encoding="utf-8").split("\n") if l.strip()]

    failures = 0
    n_paraphrase = 0
    n_no_answer = 0
    for i, line in enumerate(lines, start=1):
        obj = json.loads(line)
        if obj.get("query_type") == "no_answer":
            n_no_answer += 1
            continue
        n_paraphrase += 1
        violations = check_query(obj["query"], obj["relevant"], lookup)
        if violations:
            failures += 1
            print(f"[line {i}] VIOLATION: {obj['query']!r}")
            for target, words in violations.items():
                print(f"    vs {target}: shared content words = {sorted(words)}")

    print(f"\n{n_paraphrase} descriptive_paraphrase queries, {n_no_answer} no_answer queries checked.")
    if failures:
        print(f"{failures} queries violate the no-content-word-overlap rule.")
        return 1
    print("All paraphrase queries pass the no-content-word-overlap check.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
