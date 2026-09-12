import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "api"))

import main as api_main  # noqa: E402


class TestI18nResolve(unittest.TestCase):
    """Exercises the pure helper functions directly -- no need to spin up
    the full app (RetrievalIndex.build() loads a sentence-transformer model
    and is out of scope for testing i18n resolution)."""

    def test_resolve_english_is_plain_strings(self):
        resolved = api_main._resolve_lang("en")
        self.assertIsInstance(resolved["tabStandards"], str)
        self.assertGreater(len(resolved), 0)

    def test_resolve_hindi_unwraps_provenance(self):
        resolved = api_main._resolve_lang("hi")
        # hi.json stores {"value": ..., "source": "human", "en_hash": ...} --
        # the served value must be the plain string, not the wrapper dict.
        self.assertIsInstance(resolved["tabStandards"], str)
        self.assertNotEqual(resolved["tabStandards"], "")

    def test_all_languages_have_real_key_no_fallback_needed(self):
        # As of the sync_translations.py --apply run (Part 4 fixes pass), all
        # 8 languages have every en.json key -- Tamil used to be missing
        # "catalogueRef" and fall back to English; it's now machine-translated.
        # Fallback-to-English *behavior* itself is still covered generically
        # by TestI18nDirIsolated below (a fixture with a deliberately missing
        # key), independent of this file's real, changing data.
        en = api_main._resolve_lang("en")
        ta = api_main._resolve_lang("ta")
        self.assertIn("catalogueRef", ta)
        self.assertNotEqual(ta["catalogueRef"], "")
        self.assertNotEqual(ta["catalogueRef"], en["catalogueRef"])  # actually translated, not falling back

    def test_not_determined_present_and_not_literal_none(self):
        en = api_main._resolve_lang("en")
        hi = api_main._resolve_lang("hi")
        self.assertEqual(en["certification.Not determined"], "Not determined")
        self.assertNotIn(hi["certification.Not determined"], ("None", "", "Not determined"))

    def test_all_eight_languages_cover_cert_confidence_relationship_keys(self):
        required_suffixes = [
            "certification.BIS Product Certification",
            "certification.CRS",
            "certification.Hallmarking",
            "certification.Not determined",
            "confidenceBand.high",
            "confidenceBand.moderate",
            "confidenceBand.low",
            "relationshipType.test_method",
            "relationshipType.safety",
            "relationshipType.terminology",
            "relationshipType.installation",
            "relationshipType.normative_reference",
        ]
        for lang in ["en", "hi", "ta", "te", "bn", "mr", "gu", "kn"]:
            resolved = api_main._resolve_lang(lang)
            for key in required_suffixes:
                self.assertIn(key, resolved, f"{key} missing for {lang}")
                self.assertTrue(resolved[key], f"{key} blank for {lang}")


class TestI18nEndpointFunctions(unittest.TestCase):
    def test_i18n_languages_lists_all_eight_with_native_names(self):
        response = api_main.i18n_languages()
        codes = {l.code for l in response.languages}
        self.assertEqual(codes, {"en", "hi", "ta", "te", "bn", "mr", "gu", "kn"})
        by_code = {l.code: l.native_name for l in response.languages}
        self.assertEqual(by_code["hi"], "हिन्दी")
        self.assertEqual(by_code["ta"], "தமிழ்")

    def test_i18n_valid_lang_returns_flat_dict(self):
        result = api_main.i18n("hi")
        self.assertIsInstance(result, dict)
        self.assertIsInstance(result["tabStandards"], str)

    def test_i18n_unknown_lang_is_404_listing_valid_codes(self):
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as ctx:
            api_main.i18n("xx")
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("hi", ctx.exception.detail)
        self.assertIn("xx", ctx.exception.detail)


class TestI18nDirIsolated(unittest.TestCase):
    """Confirms the resolver is driven entirely by I18N_DIR (not some
    other hardcoded path), by pointing it at a throwaway fixture."""

    def test_fallback_uses_whatever_en_json_is_on_disk(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            (d / "en.json").write_text(json.dumps({"greeting": "Hello"}), encoding="utf-8")
            (d / "hi.json").write_text(json.dumps({}), encoding="utf-8")
            with patch.object(api_main, "I18N_DIR", d):
                resolved = api_main._resolve_lang("hi")
                self.assertEqual(resolved["greeting"], "Hello")


if __name__ == "__main__":
    unittest.main()
