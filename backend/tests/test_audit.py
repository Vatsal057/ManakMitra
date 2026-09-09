import os
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from audit.tender_audit import split_clauses, audit_specification
from retrieval.search import RetrievalIndex

ROOT = Path(__file__).resolve().parents[1]
SAMPLE_SPECS_DIR = ROOT / "data" / "eval" / "sample_specs"

_FORBIDDEN_WORDS = re.compile(r"\b(outdated|superseded|current)\b", re.IGNORECASE)


def _load_spec(name: str) -> str:
    return (SAMPLE_SPECS_DIR / name).read_text(encoding="utf-8")


class TestClauseSplitting(unittest.TestCase):
    def test_numbered_clauses(self):
        text = "4.1 First clause here.\n4.2 Second clause here.\n4.2.1 Sub-clause here."
        clauses = split_clauses(text)
        self.assertEqual(len(clauses), 3)

    def test_bullets(self):
        text = "- First item.\n* Second item.\n• Third item."
        clauses = split_clauses(text)
        self.assertEqual(len(clauses), 3)

    def test_plain_sentences_no_markers(self):
        text = "This is one sentence. This is another sentence. And a third one."
        clauses = split_clauses(text)
        self.assertEqual(len(clauses), 3)

    def test_mixed_formatting(self):
        # Real tender text mixes all three -- this is the case the decision
        # rule (prefer over-splitting) exists for.
        text = "4.1 Numbered clause. With two sentences.\n- Bullet item here.\nA plain trailing sentence."
        clauses = split_clauses(text)
        self.assertGreaterEqual(len(clauses), 4)  # over-split is fine; under-split is not


class TestTenderAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = RetrievalIndex.build()

    def test_cement_rcc_sample_finds_missing_reference_and_edition_mismatch(self):
        spec = _load_spec("01_cement_rcc.txt")
        result = audit_specification(spec, self.index)

        self.assertGreater(result["summary"]["missing_normative_refs_total"], 0)
        self.assertGreater(result["summary"]["edition_mismatches_total"], 0)

        # The specific planted finding from the task's own example: IS 1786
        # cited without its Clause 8.1 tensile test method, IS 1608.
        is1786_clause = next(f for f in result["clauses"] if "IS 1786" in f["cited_standards"])
        missing_numbers = {m["missing_standard"] for m in is1786_clause["missing_normative_refs"]}
        self.assertIn("IS 1608", missing_numbers)

        # The planted edition mismatch: cited 1978, corpus record is 2000.
        is456_clause = next(f for f in result["clauses"] if "IS 456" in f["cited_standards"])
        self.assertTrue(any("1978" in n and "2000" in n for n in is456_clause["edition_notes"]))

    def test_electrical_sample_finds_no_allied_mapping_case(self):
        spec = _load_spec("02_electrical.txt")
        result = audit_specification(spec, self.index)

        # IS 732 is cited but is not one of the 45 primaries -- must be
        # reported as "no allied mapping available", never as "zero refs".
        is732_clause = next(f for f in result["clauses"] if "IS 732:1989" in f["cited_standards"])
        self.assertEqual(len(is732_clause["missing_normative_refs"]), 1)
        self.assertEqual(is732_clause["missing_normative_refs"][0]["note"], "no allied mapping available")
        self.assertIsNone(is732_clause["missing_normative_refs"][0]["missing_standard"])

        self.assertGreater(result["summary"]["edition_mismatches_total"], 0)

    def test_mixed_sample_abstains_on_uncited_no_answer_clause(self):
        spec = _load_spec("03_mixed.txt")
        result = audit_specification(spec, self.index)

        cctv_clause = next(f for f in result["clauses"] if "CCTV" in f["clause_text"])
        self.assertTrue(cctv_clause["abstained"])
        self.assertEqual(cctv_clause["abstain_reason"], "no applicable standard found in corpus")
        # Near-misses are still listed, not an empty list.
        self.assertGreater(len(cctv_clause["suggested_standards"]), 0)

        self.assertGreater(result["summary"]["missing_normative_refs_total"], 0)
        self.assertGreater(result["summary"]["edition_mismatches_total"], 0)

    def test_no_forbidden_currency_words_anywhere(self):
        for name in ("01_cement_rcc.txt", "02_electrical.txt", "03_mixed.txt"):
            spec = _load_spec(name)
            result = audit_specification(spec, self.index)
            for finding in result["clauses"]:
                for note in finding["edition_notes"]:
                    self.assertNotRegex(note, _FORBIDDEN_WORDS)
                for mr in finding["missing_normative_refs"]:
                    text = (mr.get("note") or "")
                    self.assertNotRegex(text, _FORBIDDEN_WORDS)

    def test_uncited_clause_never_returns_confident_wrong_suggestion_silently(self):
        # An abstained clause must carry the literal B3 phrase, not a
        # confidently-worded suggestion dressed up as fact.
        spec = _load_spec("03_mixed.txt")
        result = audit_specification(spec, self.index)
        for f in result["clauses"]:
            if f["abstained"]:
                self.assertEqual(f["abstain_reason"], "no applicable standard found in corpus")


if __name__ == "__main__":
    unittest.main()
