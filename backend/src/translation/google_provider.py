"""Google Cloud Translation (v2, API-key auth) provider.

Free tier covers a demo's handful of calls. Uses httpx (already a project
dependency) rather than the google-cloud-translate SDK -- one REST call,
no new dependency.
"""
from __future__ import annotations

import logging
import os

import httpx

from .base import TranslationResult
from .env import load_dotenv

logger = logging.getLogger(__name__)

GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"


class GoogleTranslateProvider:
    name = "google"

    def __init__(self, api_key: str | None = None):
        load_dotenv()
        self.api_key = api_key or os.environ.get("GOOGLE_TRANSLATE_API_KEY")
        if not self.api_key:
            logger.warning(
                "GOOGLE_TRANSLATE_API_KEY not set -- running English-only. "
                "Non-English queries will pass through untranslated (failed=True)."
            )

    def translate(self, text: str, source_lang: str) -> TranslationResult:
        if not self.api_key:
            return TranslationResult(text, source_lang, self.name, cached=False, failed=True)
        try:
            resp = httpx.post(
                GOOGLE_TRANSLATE_URL,
                params={"key": self.api_key},
                json={"q": text, "source": source_lang, "target": "en", "format": "text"},
                timeout=8.0,
            )
            resp.raise_for_status()
            translated = resp.json()["data"]["translations"][0]["translatedText"]
            return TranslationResult(translated, source_lang, self.name, cached=False, failed=False)
        except Exception as e:
            logger.warning("Google Translate call failed (%s) -- passing text through untranslated.", e)
            return TranslationResult(text, source_lang, self.name, cached=False, failed=True)
