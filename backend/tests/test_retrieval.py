import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from retrieval.identifiers import extract_identifier, resolve_identifier, split_identifier_from_text
from retrieval.search import RetrievalIndex, RRF_K


class TestRetrievalIndex(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = RetrievalIndex.build()

    def test_exact_identifier_resolves_and_ranks_first(self):
        results = self.index.search("IS 456", top_k=5)
        self.assertEqual(results[0].match_type, "exact_identifier")
        wire = self.index.to_wire(results[0])
        from data_pipeline.normalize import normalize_standard_number
        norm = normalize_standard_number(wire["standard_number"])
        self.assertEqual((norm.is_number, norm.part), (456, None))

    def test_exact_identifier_respects_part(self):
        # IS 302 has multiple unrelated parts (clocks, massage appliances,
        # electric irons) -- "IS 302-2-3" must resolve to that exact part,
        # not an arbitrary sibling. Regression test for the class of bug
        # fixed in the certification pass (bare is_number matching).
        results = self.index.search("IS 302-2-3", top_k=1)
        self.assertEqual(results[0].match_type, "exact_identifier")
        wire = self.index.to_wire(results[0])
        from data_pipeline.normalize import normalize_standard_number
        norm = normalize_standard_number(wire["standard_number"])
        self.assertEqual((norm.is_number, norm.part), (302, "2-3"))

    def test_rrf_fusion_ordering(self):
        # Synthetic, hand-computed case -- independent of the real corpus.
        dense_scores = np.array([0.9, 0.5, 0.95, 0.1])
        bm25_scores = np.array([1.0, 2.0, 0.5, 0.0])

        dense_ranks = RetrievalIndex._ranks_from_scores(dense_scores)
        bm25_ranks = RetrievalIndex._ranks_from_scores(bm25_scores)
        np.testing.assert_array_equal(dense_ranks, [2, 3, 1, 4])
        np.testing.assert_array_equal(bm25_ranks, [2, 1, 3, 4])

        fused = 1.0 / (RRF_K + dense_ranks) + 1.0 / (RRF_K + bm25_ranks)
        expected = np.array([
            1 / 62 + 1 / 62,
            1 / 63 + 1 / 61,
            1 / 61 + 1 / 63,
            1 / 64 + 1 / 64,
        ])
        np.testing.assert_allclose(fused, expected)

        # Rank-1 tie between index 1 and 2 (both ~0.032266) broken by
        # original row order -- index 1 before index 2 -- then index 0,
        # then index 3.
        order = np.argsort(-fused, kind="stable")
        self.assertEqual(list(order), [1, 2, 0, 3])

    def test_allied_join_exact_pair(self):
        # IS 302-2-3 (electric irons) has real allied entries; bare IS 302
        # (no part) must NOT inherit them -- that's the primary's exact
        # (is_number, part) pair, mirroring the certification join fix.
        with_part = self.index.allied_for(302, "2-3")
        without_part = self.index.allied_for(302, None)
        total_with_part = sum(len(v) for v in with_part.values())
        total_without_part = sum(len(v) for v in without_part.values())
        self.assertGreater(total_with_part, 0)
        self.assertEqual(total_without_part, 0)

    def test_allied_unmapped_returns_empty_groups_not_error(self):
        groups = self.index.allied_for(999999, None)
        self.assertEqual(set(groups.keys()), {"test_method", "safety", "terminology", "installation", "normative_reference"})
        self.assertTrue(all(v == [] for v in groups.values()))

    def test_not_determined_survives_full_path(self):
        # Find a real row with certification_type == "Not determined" and
        # confirm to_wire() never remaps it to "None" or drops it.
        row_idx = self.index.df.index[self.index.df["certification_type"] == "Not determined"][0]
        from retrieval.search import SearchResult
        wire = self.index.to_wire(SearchResult(row_idx, 1.0, 1.0, "hybrid"))
        self.assertEqual(wire["certification_badge"], "Not determined")
        self.assertIsNone(wire["mandatory"])
        self.assertNotEqual(wire["certification_badge"], "None")

    def test_relationship_values_all_map_to_frontend_keys(self):
        # Every distinct `relationship` value actually on disk must map to
        # one of the buckets the frontend's RelationshipType union declares
        # (src/types/standards.ts) -- fails the build if a new unmapped
        # value shows up instead of surfacing as a demo-time silent drop.
        frontend_keys = {"test_method", "safety", "terminology", "installation", "normative_reference"}
        from retrieval.search import _RELATIONSHIP_REMAP
        raw_values = {
            allied.get("relationship")
            for entry in self.index.allied_data
            for allied in entry.get("allied_standards", [])
        }
        self.assertTrue(raw_values, "expected at least one relationship value in the mapping file")
        for raw in raw_values:
            self.assertIn(raw, _RELATIONSHIP_REMAP, f"unmapped relationship value: {raw!r}")
            self.assertIn(_RELATIONSHIP_REMAP[raw], frontend_keys)
        # "terminology" is a declared frontend bucket with no corresponding
        # raw value -- confirmed absent from the source data (not present
        # under another label and silently dropped).
        self.assertNotIn("terminology", raw_values)

    def test_no_answer_query_lands_in_low_band_and_abstains(self):
        query = "USB Type-C charging cable and connector for mobile devices"
        confidence, band, abstained, reason = self.index.compute_confidence(query, self.index.search(query, top_k=5))
        self.assertEqual(band, "low")
        self.assertTrue(abstained)
        self.assertIsNotNone(reason)

    def test_genuine_query_does_not_abstain(self):
        query = "43 grade ordinary portland cement for general RCC work"
        confidence, band, abstained, reason = self.index.compute_confidence(query, self.index.search(query, top_k=5))
        self.assertIn(band, ("moderate", "high"))
        self.assertFalse(abstained)
        self.assertIsNone(reason)

    def test_exact_identifier_never_abstains_despite_low_dense_similarity(self):
        # Bare "IS 1786" has low dense similarity (little semantic content
        # to embed) but is a deterministic, correct citation -- must never
        # be gated by the dense-similarity confidence bands.
        query = "IS 1786"
        results = self.index.search(query, top_k=5)
        self.assertEqual(results[0].match_type, "exact_identifier")
        confidence, band, abstained, reason = self.index.compute_confidence(query, results)
        self.assertEqual(band, "high")
        self.assertFalse(abstained)

    def test_moderate_band_query_shown_but_not_abstained(self):
        # One of the genuine paraphrase queries known to land in "moderate"
        # at the current calibration (see LOW_CONFIDENCE_BOUNDARY's
        # docstring) -- regression test for the graded-band replacement of
        # binary abstention: this query used to be a false abstain (band
        # would have been "low" under the old ABSTENTION_THRESHOLD-only gate).
        query = "red masonry blocks for load-bearing walls"
        confidence, band, abstained, reason = self.index.compute_confidence(query, self.index.search(query, top_k=5))
        self.assertEqual(band, "moderate")
        self.assertFalse(abstained)

    def test_retrieval_mode_routes_by_bm25_signal(self):
        # Vocabulary-matched (frozen-set-style) query should have BM25
        # signal and route to hybrid; a paraphrase-style query (no shared
        # vocabulary with its target) should route to dense_only.
        vocab_results = self.index.search("43 grade ordinary portland cement for general RCC work", top_k=1)
        self.assertEqual(vocab_results[0].retrieval_mode, "hybrid")

        paraphrase_results = self.index.search("table spread dairy substitute product", top_k=1)
        self.assertEqual(paraphrase_results[0].retrieval_mode, "dense_only")


class TestExtractIdentifier(unittest.TestCase):
    def test_bare_identifier(self):
        m = extract_identifier("IS 456")
        self.assertIsNotNone(m)
        self.assertEqual(m.is_number, 456)

    def test_ordinary_free_text_returns_none(self):
        m = extract_identifier("43 grade ordinary portland cement for general RCC work")
        self.assertIsNone(m)

    def test_no_answer_query_returns_none(self):
        m = extract_identifier("solar photovoltaic module mounting structure for rooftop installation")
        self.assertIsNone(m)

    def test_marathi_identifier_resolves_without_translation(self):
        # "IS 1786" in Marathi, per NLLB's own en->mr generation (see
        # data/cache/translations.json) -- NLLB mistranslates this bare
        # string to English as "The first is the ISI 1786.", which would
        # fail the (Latin-only) identifier regex if detection ran on the
        # translated text. Detection must run on the ORIGINAL Marathi text.
        m = extract_identifier("आयएस १७८६")
        self.assertIsNotNone(m)
        self.assertEqual(m.is_number, 1786)

    def test_kannada_identifier_resolves_without_translation(self):
        # "IS 1786" in Kannada -- NLLB hallucinates this one entirely on
        # translation ("The following is a list of the countries of the
        # United States."), the worst case found live. Detection on the
        # original text must not be affected by that at all.
        m = extract_identifier("ಐಎಸ್ 1786")
        self.assertIsNotNone(m)
        self.assertEqual(m.is_number, 1786)

    def test_hindi_bengali_tamil_identifiers_also_resolve(self):
        for text, expected in [("आईएस 1786", 1786), ("আইএস ১৭৮৬", 1786), ("ஐஎஸ் 1786", 1786)]:
            m = extract_identifier(text)
            self.assertIsNotNone(m, f"failed to detect identifier in {text!r}")
            self.assertEqual(m.is_number, expected)

    def test_split_identifier_from_text_separates_mixed_query(self):
        match, remainder = split_identifier_from_text("आयएस १७८६ के लिए")
        self.assertIsNotNone(match)
        self.assertEqual(match.is_number, 1786)
        self.assertNotIn("१७८६", remainder)

    def test_split_identifier_from_text_no_identifier_returns_original(self):
        match, remainder = split_identifier_from_text("सामान्य पोर्टलैंड सीमेंट")
        self.assertIsNone(match)
        self.assertEqual(remainder, "सामान्य पोर्टलैंड सीमेंट")


class TestIdentifierBypassesTranslation(unittest.TestCase):
    """API-level contract: a bare identifier query in a non-English script
    must never reach the translation provider at all (Task 1's actual
    requirement, not just that identifiers.py can parse the string) --
    calls the real /recommend route function with a translator stub that
    fails the test if it's ever invoked."""

    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
        from api import main as api_main
        cls.api_main = api_main
        cls.index = RetrievalIndex.build()

    class _ExplodingTranslator:
        def translate(self, text, source_lang):
            raise AssertionError("translator must not be called for a pure-identifier query")

    def _run_recommend(self, query: str, source_lang: str):
        self.api_main.app.state.index = self.index
        self.api_main.app.state.translator = self._ExplodingTranslator()
        req = self.api_main.RecommendRequest(query=query, top_k=1, source_lang=source_lang)
        return self.api_main.recommend(req)

    def test_recommend_route_skips_translator_for_marathi_identifier(self):
        resp = self._run_recommend("आयएस १७८६", "mr")
        self.assertEqual(resp.results[0].match_type, "exact_identifier")
        self.assertEqual(resp.translation_provider, "identifier-detection")

    def test_recommend_route_skips_translator_for_kannada_identifier(self):
        resp = self._run_recommend("ಐಎಸ್ 1786", "kn")
        self.assertEqual(resp.results[0].match_type, "exact_identifier")
        self.assertEqual(resp.translation_provider, "identifier-detection")


if __name__ == "__main__":
    unittest.main()
