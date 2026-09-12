import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from evaluate import append_results_md  # noqa: E402


class TestResultsMdAppendOnly(unittest.TestCase):
    """Guard against the overwrite bug: evaluate.py used to call
    RESULTS_PATH.write_text(...) directly, truncating every prior run's
    results. append_results_md must only ever grow the file."""

    def test_append_never_shrinks_and_keeps_prior_content(self, tmp_path=None):
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "RESULTS.md"
            path.write_text("# Retrieval Evaluation Results\n\nprior run content\n", encoding="utf-8")
            before_len = len(path.read_text(encoding="utf-8"))

            append_results_md("## Table 1\n\nnew run content\n", path, corpus_size=337)

            after_text = path.read_text(encoding="utf-8")
            self.assertGreater(len(after_text), before_len)
            self.assertIn("prior run content", after_text)
            self.assertIn("new run content", after_text)
            self.assertIn("# Dated section:", after_text)
            self.assertIn("corpus 337 rows", after_text)

    def test_append_creates_file_when_missing(self):
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "RESULTS.md"
            self.assertFalse(path.exists())
            append_results_md("first run content\n", path, corpus_size=100)
            self.assertTrue(path.exists())
            self.assertIn("first run content", path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
