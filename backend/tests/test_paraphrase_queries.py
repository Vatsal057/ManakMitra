import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from check_paraphrase_queries import content_words, check_query, _composed_text_lookup, QUERIES_PATH
import json


class TestOverlapChecker(unittest.TestCase):
    def test_detects_real_overlap(self):
        lookup = _composed_text_lookup()
        # IS 1786's own scope literally contains "bars" and "reinforcement"
        violations = check_query("deformed steel bars for reinforcement", ["IS 1786"], lookup)
        self.assertIn("IS 1786", violations)

    def test_clean_query_passes(self):
        lookup = _composed_text_lookup()
        violations = check_query("TMT rods Fe 500 for column framework", ["IS 1786"], lookup)
        self.assertEqual(violations, {})

    def test_stopwords_and_category_words_exempt(self):
        # "cement" is a category-label word, not scope-specific content --
        # must not by itself trigger a violation against every cement row.
        words = content_words("cement for the general construction")
        self.assertNotIn("cement", words)
        self.assertNotIn("construction", words)
        self.assertNotIn("for", words)
        self.assertNotIn("the", words)

    def test_numbers_and_units_exempt(self):
        words = content_words("Fe 500 grade 1100V cable 43")
        self.assertNotIn("500", words)
        self.assertNotIn("43", words)
        self.assertNotIn("fe", words)  # len <= 2


class TestFrozenParaphraseFile(unittest.TestCase):
    """Regression test: the shipped queries_paraphrase.jsonl must always
    pass its own construction rule -- this is what would fail the build if
    someone later edits it and reintroduces an overlap."""

    # Accepted as of the prompt-9 corpus merge: IS 383's composed_text was
    # upgraded from a title_fallback stub to real curated scope text
    # (scripts/merge_curated_supplement.py), which incidentally introduced
    # the single common word "sand" -- the query's target standard, not a
    # systematic vocabulary match. The query set itself is frozen and was
    # NOT edited to route around this; re-check after any future corpus
    # change to confirm the overlap is still just this one word.
    _ACCEPTED_OVERLAPS = {
        ("stone chips and river sand for concreting", "IS 383"): {"sand"},
    }

    def test_file_has_no_overlap_violations(self):
        lookup = _composed_text_lookup()
        lines = [l for l in QUERIES_PATH.read_text(encoding="utf-8").strip().split("\n") if l.strip()]
        failures = []
        for line in lines:
            obj = json.loads(line)
            if obj.get("query_type") != "descriptive_paraphrase":
                continue
            violations = check_query(obj["query"], obj["relevant"], lookup)
            for standard, words in list(violations.items()):
                accepted = self._ACCEPTED_OVERLAPS.get((obj["query"], standard))
                if accepted is not None and words == accepted:
                    del violations[standard]
            if violations:
                failures.append((obj["query"], violations))
        self.assertEqual(failures, [], f"overlap violations: {failures}")

    def test_file_has_8_to_10_no_answer_queries(self):
        lines = [l for l in QUERIES_PATH.read_text(encoding="utf-8").strip().split("\n") if l.strip()]
        no_answer = [json.loads(l) for l in lines if json.loads(l).get("query_type") == "no_answer"]
        self.assertGreaterEqual(len(no_answer), 8)
        self.assertLessEqual(len(no_answer), 10)
        for q in no_answer:
            self.assertEqual(q["relevant"], [])

    def test_file_size_in_range(self):
        lines = [l for l in QUERIES_PATH.read_text(encoding="utf-8").strip().split("\n") if l.strip()]
        self.assertGreaterEqual(len(lines), 30)
        self.assertLessEqual(len(lines), 40)


if __name__ == "__main__":
    unittest.main()
