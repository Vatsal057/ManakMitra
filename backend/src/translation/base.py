"""Provider-swappable translation interface.

We may swap the Google Cloud provider for a local/offline model (e.g.
IndicTrans2) later -- nothing outside this package may depend on the Google
client directly, only on TranslationProvider.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class TranslationResult:
    translated_text: str
    source_lang: str
    provider: str
    cached: bool
    failed: bool


class TranslationProvider(Protocol):
    name: str

    def translate(self, text: str, source_lang: str) -> TranslationResult:
        ...
