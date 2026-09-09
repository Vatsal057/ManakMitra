"""Pre-cache translations for the demo query shortlist, across every
non-English language the frontend advertises.

Run this once (with a working GOOGLE_TRANSLATE_API_KEY) before a demo, then
commit data/cache/translations.json -- with the cache populated, the
multilingual path works with the network fully off (Part B4).

Uses the Part A shortlist (data/eval/DEMO_CANDIDATES.md's "Recommended
shortlist" queries) -- run scripts/demo_candidates.py first.
"""
from __future__ import annotations

import io
import sys
from pathlib import Path

# Windows consoles default to cp1252, which can't encode Devanagari/Tamil/
# etc. -- this script's whole point is printing native-script text, so
# force UTF-8 stdout rather than crash mid-run on the first non-Latin line.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from translation.service import TranslationService  # noqa: E402
from translation.nllb_provider import generate_native_query  # noqa: E402

# Kept as a literal list (not parsed out of the markdown table) so this
# script has one clear, editable source of truth. Update by hand after
# re-running scripts/demo_candidates.py and reviewing the new shortlist.
DEMO_SHORTLIST = [
    "head safety gear for factory floor workers",
    "43 grade ordinary Portland cement for general RCC construction work",
    "IS 1786",
    "biometric fingerprint attendance device for office entry",
    "ordinary Portland cement for general construction work",
    "wall socket with built-in safety interlock mechanism",
]

# The frontend's SUPPORTED_LANGUAGES (src/services/mockData.ts), minus English.
DEMO_LANGUAGES = ["hi", "ta", "te", "bn", "mr", "gu", "kn"]


def main() -> None:
    service = TranslationService()
    total = 0
    failed = 0
    for lang in DEMO_LANGUAGES:
        for query in DEMO_SHORTLIST:
            # The demo shortlist is authored in English (it's a re-ranking
            # of the frozen eval sets). Nobody on this project speaks all
            # seven languages, so hand-typing "native" queries would be
            # exactly the kind of fabrication this project's hard rules
            # forbid. Instead, generate a real native-script query with the
            # same NLLB checkpoint (en -> target_lang), then run the actual
            # indic-to-English translation path on that generated text --
            # what gets cached is a real translation of a real (if
            # machine-generated) native-language sentence, not an invented
            # English->foreign mapping.
            native_query = generate_native_query(query, lang)
            result = service.translate(native_query, lang)
            total += 1
            status = "CACHED (already)" if result.cached else ("OK" if not result.failed else "FAILED")
            if result.failed:
                failed += 1
            print(f"[{lang}] {status}: {native_query!r} -> {result.translated_text!r}  (from English: {query!r})")

    print(f"\n{total - failed}/{total} translated and cached, {failed} failed (passed through untranslated).")


if __name__ == "__main__":
    main()
