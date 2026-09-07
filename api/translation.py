"""Translation for multilingual queries.

Three tiers, in order:

1. **Google Cloud Translation v2** when ``GOOGLE_TRANSLATE_API_KEY`` is set.
2. **LibreTranslate** when ``LIBRETRANSLATE_URL`` is set (self-hosted, no key).
3. **Offline demo glossary** — a small hand-written procurement vocabulary for
   Hindi, Marathi, Bengali and Tamil. This is explicitly *not* machine
   translation: it substitutes known procurement terms so the demo works with no
   network. Responses say so via ``provider="offline-glossary"``.

If none of the above can handle the text, the original text is returned with
``translation_unavailable=True`` and a reason, never an exception.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

GOOGLE_ENDPOINT = "https://translation.googleapis.com/language/translate/v2"
REQUEST_TIMEOUT = 8.0

SUPPORTED_LANGUAGES: Dict[str, str] = {
    "en": "English",
    "hi": "हिन्दी (Hindi)",
    "mr": "मराठी (Marathi)",
    "bn": "বাংলা (Bengali)",
    "ta": "தமிழ் (Tamil)",
    "te": "తెలుగు (Telugu)",
    "gu": "ગુજરાતી (Gujarati)",
    "kn": "ಕನ್ನಡ (Kannada)",
    "ml": "മലയാളം (Malayalam)",
    "pa": "ਪੰਜਾਬੀ (Punjabi)",
}

# Devanagari, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Gurmukhi.
_INDIC_RANGES = (
    (0x0900, 0x097F), (0x0980, 0x09FF), (0x0B80, 0x0BFF), (0x0C00, 0x0C7F),
    (0x0A80, 0x0AFF), (0x0C80, 0x0CFF), (0x0D00, 0x0D7F), (0x0A00, 0x0A7F),
)

# Offline demo vocabulary: procurement terms -> English. Deliberately small and
# auditable. Longest keys are substituted first so multi-word terms win.
_GLOSSARY: Dict[str, str] = {
    # materials
    "सीमेंट": "cement",
    "सिमेंट": "cement",
    "इस्पात": "steel",
    "स्टील": "steel",
    "सरिया": "reinforcement bar",
    "छड़": "bar",
    "कंक्रीट": "concrete",
    "ईंट": "brick",
    "ईंटें": "bricks",
    "रेत": "sand",
    "बालू": "sand",
    "गिट्टी": "coarse aggregate",
    "पानी": "water",
    "पेयजल": "drinking water",
    "तार": "wire",
    "केबल": "cable",
    "तांबा": "copper",
    "तांबे": "copper",
    "बिजली": "electrical",
    "विद्युत": "electrical",
    "सिलेंडर": "cylinder",
    "गैस": "gas",
    "रसोई गैस": "LPG cooking gas",
    "खिलौने": "toys",
    "खिलौना": "toy",
    "सोना": "gold",
    "सोने": "gold",
    "आभूषण": "jewellery",
    "चांदी": "silver",
    "हेलमेट": "helmet",
    "जूते": "footwear",
    "कपड़ा": "fabric",
    "वस्त्र": "textile",
    "बोतल": "bottle",
    "लैपटॉप": "laptop",
    "कंप्यूटर": "computer",
    "बैटरी": "battery",
    "पंखा": "fan",
    "पाइप": "pipe",
    # procurement vocabulary
    "आपूर्ति": "supply",
    "खरीद": "procurement",
    "निविदा": "tender",
    "विनिर्देश": "specification",
    "मानक": "standard",
    "गुणवत्ता": "quality",
    "ग्रेड": "grade",
    "प्रमाणन": "certification",
    "परीक्षण": "test",
    "सुरक्षा": "safety",
    "स्थापना": "installation",
    "निर्माण": "construction",
    "भवन": "building",
    "सड़क": "road",
    "पुल": "bridge",
    "विद्यालय": "school",
    "अस्पताल": "hospital",
    "कार्यालय": "office",
    "घरेलू": "domestic",
    "औद्योगिक": "industrial",
    "किलो": "kg",
    "लीटर": "litre",
    "मिमी": "mm",
    # Marathi / Bengali / Tamil samples used in the demo
    "सिमेंटचा": "cement",
    "पुरवठा": "supply",
    "সিমেন্ট": "cement",
    "সরবরাহ": "supply",
    "ইস্পাত": "steel",
    "পানীয় জল": "drinking water",
    "சிமெண்ட்": "cement",
    "விநியோகம்": "supply",
    "எஃகு": "steel",
    "குடிநீர்": "drinking water",
}
_GLOSSARY_ORDERED = sorted(_GLOSSARY.items(), key=lambda kv: len(kv[0]), reverse=True)


@dataclass
class TranslationResult:
    text: str
    original_text: str
    provider: str
    applied: bool
    source_lang: Optional[str] = None
    target_lang: str = "en"
    unavailable_reason: Optional[str] = None


def contains_indic_script(text: str) -> bool:
    """True if the text has characters from a major Indic script."""
    return any(
        any(low <= ord(ch) <= high for low, high in _INDIC_RANGES)
        for ch in text
    )


def provider_name() -> str:
    """Which provider would be used right now (for /health)."""
    if os.getenv("GOOGLE_TRANSLATE_API_KEY"):
        return "google-translate-v2"
    if os.getenv("LIBRETRANSLATE_URL"):
        return "libretranslate"
    return "offline-glossary"


def _google_translate(
    text: str, target_lang: str, source_lang: Optional[str]
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Returns (translated_text, detected_source_lang, error)."""
    api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY")
    if not api_key:
        return None, None, "GOOGLE_TRANSLATE_API_KEY is not set"
    payload: Dict[str, str] = {"q": text, "target": target_lang, "format": "text"}
    if source_lang and source_lang != "auto":
        payload["source"] = source_lang
    try:
        response = httpx.post(
            GOOGLE_ENDPOINT, params={"key": api_key}, data=payload, timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        item = response.json()["data"]["translations"][0]
        return item["translatedText"], item.get("detectedSourceLanguage", source_lang), None
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        logger.warning("Google translation failed (%s)", exc)
        return None, None, f"translation provider error: {type(exc).__name__}"


def _libre_translate(
    text: str, target_lang: str, source_lang: Optional[str]
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    base_url = os.getenv("LIBRETRANSLATE_URL")
    if not base_url:
        return None, None, "LIBRETRANSLATE_URL is not set"
    payload = {
        "q": text,
        "source": source_lang or "auto",
        "target": target_lang,
        "format": "text",
    }
    api_key = os.getenv("LIBRETRANSLATE_API_KEY")
    if api_key:
        payload["api_key"] = api_key
    try:
        response = httpx.post(
            f"{base_url.rstrip('/')}/translate", json=payload, timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        body = response.json()
        detected = (body.get("detectedLanguage") or {}).get("language", source_lang)
        return body["translatedText"], detected, None
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        logger.warning("LibreTranslate failed (%s)", exc)
        return None, None, f"translation provider error: {type(exc).__name__}"


def _glossary_translate(text: str) -> Tuple[Optional[str], int]:
    """Substitute known procurement terms. Returns (text, terms_replaced)."""
    result = text
    replaced = 0
    for term, english in _GLOSSARY_ORDERED:
        if term in result:
            result = result.replace(term, english)
            replaced += 1
    # Drop any remaining Indic characters so they do not pollute the embedding.
    if replaced:
        result = "".join(
            ch if not any(low <= ord(ch) <= high for low, high in _INDIC_RANGES) else " "
            for ch in result
        )
        result = re.sub(r"\s+", " ", result).strip()
    return (result if replaced else None), replaced


def translate(
    text: str,
    target_lang: str = "en",
    source_lang: Optional[str] = None,
) -> TranslationResult:
    """Translate text, degrading gracefully instead of raising."""
    original = text
    if not text.strip():
        return TranslationResult(
            text=text, original_text=original, provider="none", applied=False,
            source_lang=source_lang, target_lang=target_lang,
            unavailable_reason="empty text",
        )

    if source_lang and source_lang == target_lang:
        return TranslationResult(
            text=text, original_text=original, provider="none", applied=False,
            source_lang=source_lang, target_lang=target_lang,
            unavailable_reason="source and target language are the same",
        )

    errors = []
    for name, fn in (
        ("google-translate-v2", _google_translate),
        ("libretranslate", _libre_translate),
    ):
        translated, detected, error = fn(text, target_lang, source_lang)
        if translated:
            return TranslationResult(
                text=translated, original_text=original, provider=name, applied=True,
                source_lang=detected or source_lang, target_lang=target_lang,
            )
        if error:
            errors.append(error)

    # Offline fallback only makes sense for Indic -> English.
    if target_lang == "en":
        glossed, replaced = _glossary_translate(text)
        if glossed:
            return TranslationResult(
                text=glossed, original_text=original, provider="offline-glossary",
                applied=True, source_lang=source_lang or "auto", target_lang=target_lang,
                unavailable_reason=(
                    f"no translation API configured; substituted {replaced} known "
                    "procurement term(s) from the offline demo glossary"
                ),
            )

    return TranslationResult(
        text=text, original_text=original, provider="unavailable", applied=False,
        source_lang=source_lang, target_lang=target_lang,
        unavailable_reason="; ".join(errors) or "no translation provider available",
    )
