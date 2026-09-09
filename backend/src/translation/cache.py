"""Flat JSON cache for translations, keyed by (source_lang, text).

Committed to the repo (data/cache/translations.json) once the demo shortlist
is pre-cached -- that's what lets multilingual demo queries work with the
network fully off. Unlike the embeddings cache, this one is meant to be
version-controlled.
"""
from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CACHE_PATH = REPO_ROOT / "data" / "cache" / "translations.json"


def cache_key(source_lang: str, text: str) -> str:
    return f"{source_lang}::{text}"


def load_cache(path: Path = DEFAULT_CACHE_PATH) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict, path: Path = DEFAULT_CACHE_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
