"""Local, offline translation via Meta's NLLB-200 (distilled 600M).

Chosen over IndicTrans2 because IndicTrans2's weights are gated on
HuggingFace (require an account that has accepted the model's terms plus an
access token) -- not available in this environment. NLLB-200 is ungated,
supports every language this project needs, and is "local, offline" in the
same sense IndicTrans2 would have been: no per-call network dependency once
the model is downloaded, no API key, no per-call cost.

Model + tokenizer load lazily and once (module-level cache) -- a demo makes
a handful of calls; loading a ~2.4GB seq2seq model per request would be
absurd.
"""
from __future__ import annotations

import logging
import threading

from .base import TranslationResult

logger = logging.getLogger(__name__)

MODEL_NAME = "facebook/nllb-200-distilled-600M"

# Our 2-letter frontend language codes -> NLLB's FLORES-200 codes.
# Only the 7 non-English languages the frontend's language selector offers
# (src/services/mockData.ts SUPPORTED_LANGUAGES) need an entry.
LANG_TO_FLORES = {
    "hi": "hin_Deva",
    "ta": "tam_Taml",
    "te": "tel_Telu",
    "bn": "ben_Beng",
    "mr": "mar_Deva",
    "gu": "guj_Gujr",
    "kn": "kan_Knda",
}
TARGET_FLORES = "eng_Latn"

_lock = threading.Lock()
_model = None
_tokenizer = None


def _load():
    global _model, _tokenizer
    if _model is not None:
        return
    with _lock:
        if _model is not None:
            return
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        logger.info("Loading %s (first call only)...", MODEL_NAME)
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
        _model.eval()


def generate_native_query(text: str, target_lang: str) -> str:
    """English -> target-language, using the same NLLB checkpoint in the
    reverse direction. Not part of the product's runtime translation path
    (that's always indic-to-English) -- this exists solely so
    scripts/precache_translations.py can produce real native-script demo
    queries instead of a human hand-typing (or worse, fabricating)
    translations for languages nobody on this project speaks.
    """
    flores_tgt = LANG_TO_FLORES.get(target_lang)
    if flores_tgt is None:
        raise ValueError(f"No FLORES-200 mapping for target_lang={target_lang!r}")
    _load()
    _tokenizer.src_lang = TARGET_FLORES
    inputs = _tokenizer(text, return_tensors="pt")
    forced_bos_token_id = _tokenizer.convert_tokens_to_ids(flores_tgt)
    generated = _model.generate(**inputs, forced_bos_token_id=forced_bos_token_id, max_new_tokens=256)
    return _tokenizer.batch_decode(generated, skip_special_tokens=True)[0]


class NLLBProvider:
    """Provider-swappable local translator -- see base.TranslationProvider."""

    name = "nllb-200-distilled-600M"

    def translate(self, text: str, source_lang: str) -> TranslationResult:
        flores_src = LANG_TO_FLORES.get(source_lang)
        if flores_src is None:
            logger.warning("No FLORES-200 mapping for source_lang=%r -- passing text through.", source_lang)
            return TranslationResult(text, source_lang, self.name, cached=False, failed=True)

        try:
            _load()
            _tokenizer.src_lang = flores_src
            inputs = _tokenizer(text, return_tensors="pt")
            forced_bos_token_id = _tokenizer.convert_tokens_to_ids(TARGET_FLORES)
            generated = _model.generate(**inputs, forced_bos_token_id=forced_bos_token_id, max_new_tokens=256)
            translated = _tokenizer.batch_decode(generated, skip_special_tokens=True)[0]
            return TranslationResult(translated, source_lang, self.name, cached=False, failed=False)
        except Exception as e:
            logger.warning("NLLB translation failed (%s) -- passing text through untranslated.", e)
            return TranslationResult(text, source_lang, self.name, cached=False, failed=True)
