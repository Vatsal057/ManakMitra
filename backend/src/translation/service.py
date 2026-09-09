"""Cache-checking, failure-swallowing wrapper around a TranslationProvider.

Any failure -- no key, network down, API error, uncached offline query --
passes the original text through with failed=True. Never raises: a broken
translator must degrade to "search on the original text", not error the
request. Most BIS vocabulary is transliterated, so an untranslated query
often still retrieves usefully.
"""
from __future__ import annotations

from pathlib import Path

from .base import TranslationProvider, TranslationResult
from .cache import DEFAULT_CACHE_PATH, cache_key, load_cache, save_cache
from .nllb_provider import NLLBProvider


class TranslationService:
    def __init__(self, provider: TranslationProvider | None = None, cache_path: Path = DEFAULT_CACHE_PATH):
        # Local/offline by default (NLLB-200) -- no API key, no per-call
        # network dependency. Pass provider=GoogleTranslateProvider() to
        # swap; nothing else in this module depends on either concretely.
        self.provider = provider or NLLBProvider()
        self.cache_path = cache_path
        self._cache = load_cache(cache_path)

    def translate(self, text: str, source_lang: str) -> TranslationResult:
        if source_lang == "en" or not text.strip():
            return TranslationResult(text, source_lang, "passthrough", cached=False, failed=False)

        key = cache_key(source_lang, text)
        cached = self._cache.get(key)
        if cached is not None:
            return TranslationResult(cached["translated_text"], source_lang, cached["provider"], cached=True, failed=False)

        result = self.provider.translate(text, source_lang)
        if not result.failed:
            self._cache[key] = {"translated_text": result.translated_text, "provider": result.provider}
            save_cache(self._cache, self.cache_path)
        return result
