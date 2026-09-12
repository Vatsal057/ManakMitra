import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from sync_translations import sync_language, is_protected_key  # noqa: E402


def fake_translate(text: str, lang: str) -> str:
    return f"[{lang}] {text}"


class TestProtectedKeyDetection(unittest.TestCase):
    def test_certification_and_confidence_and_abstention_are_protected(self):
        for key in [
            "certification.Not determined",
            "certification.CRS",
            "confidenceBand.high",
            "confidenceBand.low",
            "noMatchesTitle",
            "noMatchesDesc",
        ]:
            self.assertTrue(is_protected_key(key), key)

    def test_ordinary_ui_key_is_not_protected(self):
        self.assertFalse(is_protected_key("tabStandards"))
        self.assertFalse(is_protected_key("relationshipType.safety"))


class TestSyncHumanPreservation(unittest.TestCase):
    def test_human_translation_never_overwritten_on_stale_hash(self):
        en_map = {"tabStandards": "Standards Search (updated)"}
        lang_map = {
            "tabStandards": {
                "value": "मानक खोज",
                "source": "human",
                "en_hash": "stale-hash-from-before-the-english-edit",
            }
        }
        new_map, counts = sync_language("hi", en_map, lang_map, fake_translate)
        self.assertEqual(new_map["tabStandards"]["value"], "मानक खोज")  # untouched
        self.assertEqual(counts["stale_human_needs_review"], 1)
        self.assertEqual(counts["machine_filled"], 0)

    def test_machine_translation_is_refreshed_on_stale_hash(self):
        en_map = {"someKey": "New English text"}
        lang_map = {
            "someKey": {"value": "old machine output", "source": "machine", "en_hash": "old-hash"}
        }
        new_map, counts = sync_language("hi", en_map, lang_map, fake_translate)
        self.assertEqual(new_map["someKey"]["value"], "[hi] New English text")
        self.assertEqual(new_map["someKey"]["source"], "machine")
        self.assertEqual(counts["machine_filled"], 1)

    def test_matching_hash_is_left_alone(self):
        import hashlib

        en_text = "Stable text"
        en_map = {"stableKey": en_text}
        lang_map = {
            "stableKey": {
                "value": "स्थिर पाठ",
                "source": "human",
                "en_hash": hashlib.sha256(en_text.encode()).hexdigest(),
            }
        }
        new_map, counts = sync_language("hi", en_map, lang_map, fake_translate)
        self.assertEqual(new_map["stableKey"], lang_map["stableKey"])
        self.assertEqual(counts["up_to_date"], 1)

    def test_missing_key_is_machine_filled(self):
        en_map = {"newKey": "Brand new label"}
        new_map, counts = sync_language("hi", en_map, {}, fake_translate)
        self.assertEqual(new_map["newKey"]["source"], "machine")
        self.assertEqual(new_map["newKey"]["value"], "[hi] Brand new label")
        self.assertEqual(counts["machine_filled"], 1)

    def test_protected_key_missing_is_reported_not_filled(self):
        en_map = {"certification.Not determined": "Not determined"}
        new_map, counts = sync_language("hi", en_map, {}, fake_translate)
        self.assertNotIn("certification.Not determined", new_map)
        self.assertEqual(counts["protected_missing"], 1)
        self.assertEqual(counts["machine_filled"], 0)

    def test_protected_key_stale_is_reported_not_retranslated(self):
        en_map = {"confidenceBand.high": "High (revised)"}
        lang_map = {
            "confidenceBand.high": {
                "value": "उच्च",
                "source": "human",
                "en_hash": "stale-hash",
                "protected": True,
            }
        }
        new_map, counts = sync_language("hi", en_map, lang_map, fake_translate)
        self.assertEqual(new_map["confidenceBand.high"]["value"], "उच्च")  # untouched
        self.assertEqual(counts["protected_missing"], 1)
        self.assertEqual(counts["machine_filled"], 0)

    def test_orphaned_key_is_reported_and_kept(self):
        en_map = {}
        lang_map = {"removedKey": {"value": "x", "source": "human", "en_hash": "h"}}
        new_map, counts = sync_language("hi", en_map, lang_map, fake_translate)
        self.assertIn("removedKey", new_map)  # not silently deleted
        self.assertEqual(counts["orphaned"], 1)


if __name__ == "__main__":
    unittest.main()
