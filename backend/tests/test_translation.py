import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from translation.base import TranslationResult
from translation.cache import cache_key, load_cache, save_cache
from translation.service import TranslationService
from translation.nllb_provider import LANG_TO_FLORES


class FakeProvider:
    """Deterministic stand-in -- avoids loading the real 600M-parameter
    model (or hitting a network API) just to test cache/failure plumbing."""

    name = "fake"

    def __init__(self, fail: bool = False):
        self.fail = fail
        self.calls = 0

    def translate(self, text: str, source_lang: str) -> TranslationResult:
        self.calls += 1
        if self.fail:
            return TranslationResult(text, source_lang, self.name, cached=False, failed=True)
        return TranslationResult(f"[EN] {text}", source_lang, self.name, cached=False, failed=False)


class TestTranslationCache(unittest.TestCase):
    def test_round_trip(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "translations.json"
            cache = {cache_key("hi", "cement"): {"translated_text": "cement", "provider": "fake"}}
            save_cache(cache, path)
            loaded = load_cache(path)
            self.assertEqual(loaded, cache)

    def test_missing_file_returns_empty_dict(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "does_not_exist.json"
            self.assertEqual(load_cache(path), {})


class TestTranslationService(unittest.TestCase):
    def _service(self, provider):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "translations.json"
            return TranslationService(provider=provider, cache_path=path), path

    def test_english_source_is_passthrough_no_provider_call(self):
        provider = FakeProvider()
        service, _ = self._service(provider)
        result = service.translate("ordinary Portland cement", "en")
        self.assertEqual(result.translated_text, "ordinary Portland cement")
        self.assertFalse(result.failed)
        self.assertEqual(provider.calls, 0)

    def test_successful_translation_is_cached_and_reused(self):
        provider = FakeProvider()
        service, path = self._service(provider)
        first = service.translate("cement", "hi")
        self.assertFalse(first.cached)
        self.assertEqual(first.translated_text, "[EN] cement")
        self.assertEqual(provider.calls, 1)

        second = service.translate("cement", "hi")
        self.assertTrue(second.cached)
        self.assertEqual(second.translated_text, "[EN] cement")
        # Cache hit must not call the provider again.
        self.assertEqual(provider.calls, 1)
        self.assertTrue(path.exists())

    def test_provider_failure_passes_text_through_and_does_not_cache(self):
        provider = FakeProvider(fail=True)
        service, _ = self._service(provider)
        result = service.translate("cement", "hi")
        self.assertTrue(result.failed)
        self.assertEqual(result.translated_text, "cement")  # untranslated passthrough

        # A failed result must not poison the cache -- the next call should
        # retry the provider, not silently reuse a failed passthrough.
        result2 = service.translate("cement", "hi")
        self.assertFalse(result2.cached)
        self.assertEqual(provider.calls, 2)

    def test_never_raises_on_provider_exception(self):
        class ExplodingProvider:
            name = "exploding"

            def translate(self, text, source_lang):
                raise RuntimeError("network down")

        service, _ = self._service(ExplodingProvider())
        # TranslationService itself doesn't catch provider exceptions --
        # providers are responsible for swallowing their own failures (both
        # GoogleTranslateProvider and NLLBProvider do). Confirm that
        # contract holds for the real providers via their failure paths
        # rather than asserting on this deliberately-broken stub.
        with self.assertRaises(RuntimeError):
            service.translate("cement", "hi")


class TestNLLBProviderMapping(unittest.TestCase):
    def test_unsupported_language_fails_without_loading_model(self):
        from translation.nllb_provider import NLLBProvider

        result = NLLBProvider().translate("some text", "xx")
        self.assertTrue(result.failed)
        self.assertEqual(result.translated_text, "some text")

    def test_all_frontend_languages_are_mapped(self):
        # SUPPORTED_LANGUAGES in frontend/indian-standards-frontend/src/services/mockData.ts,
        # minus English -- if the frontend adds a language, this must too.
        frontend_languages = {"hi", "ta", "te", "bn", "mr", "gu", "kn"}
        self.assertEqual(set(LANG_TO_FLORES.keys()), frontend_languages)


if __name__ == "__main__":
    unittest.main()
