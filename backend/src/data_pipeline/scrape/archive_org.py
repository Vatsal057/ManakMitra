"""Scrape genuine Clause-1 Scope text (and, incidentally, publication years)
for Indian Standards from archive.org.

Spike findings (see data/ENRICHMENT_REPORT.md for the full writeup):
- The official BIS e-sale portal (standardsbis.bsbedge.com) only exposes a
  title + price purchase listing per standard -- no scope/clause text is
  present in the HTML at any depth. It is a dead end for this purpose and
  is not scraped.
- archive.org hosts OCR'd BIS standard scans uploaded under a consistent
  identifier convention: ``gov.in.is.<number>[.<part>].<year>``, in the
  "publicsafetycode" collection. Their ``_djvu.txt`` OCR text files contain
  a real "1 SCOPE" clause we can extract with a regex.

This module is a best-effort scraper against a single real source, not a
guarantee: OCR quality varies, older scans are sometimes missing, and the
clause-extraction regex can miss unusual layouts. Every result is cached to
disk (``data/cache/archive_org/``) so re-runs are free and offline.
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Optional

import requests

USER_AGENT = "ManakMitra-research/1.0 (SIH 26108 dataset enrichment; contact: lilekha@gmail.com)"
SEARCH_URL = "https://archive.org/advancedsearch.php"
CACHE_DIR = Path(__file__).resolve().parents[3] / "data" / "cache" / "archive_org"
RATE_LIMIT_SECONDS = 1.0

_SCOPE_HEADING_RE = re.compile(r"\n\s*1[.\s]+SCOPE\s*\n", re.IGNORECASE)
_NEXT_HEADING_RE = re.compile(r"\n\s*2[.\s]+[A-Z][A-Z .]{2,}\n")
_WHITESPACE_RE = re.compile(r"[ \t]+")
_IDENTIFIER_RE = re.compile(r"^gov\.in\.is\.(\d+)(?:\.(\d+))?\.(\d{4})$")

_last_request_time = 0.0


def _rate_limit() -> None:
    global _last_request_time
    elapsed = time.monotonic() - _last_request_time
    if elapsed < RATE_LIMIT_SECONDS:
        time.sleep(RATE_LIMIT_SECONDS - elapsed)
    _last_request_time = time.monotonic()


def _cache_path(*parts: str) -> Path:
    p = CACHE_DIR.joinpath(*parts)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _get(url: str, cache_file: Path, params: Optional[dict] = None) -> str:
    if cache_file.exists():
        return cache_file.read_text(encoding="utf-8")
    _rate_limit()
    resp = requests.get(url, params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
    resp.raise_for_status()
    cache_file.write_text(resp.text, encoding="utf-8")
    return resp.text


def find_identifiers(is_number: int) -> list[dict]:
    """Search archive.org for scanned IS documents matching this number."""
    cache_file = _cache_path("search", f"{is_number}.json")
    query = f'identifier:(gov.in.is.{is_number}.*)'
    text = _get(SEARCH_URL, cache_file, params={
        "q": query,
        "fl[]": ["identifier", "title"],
        "rows": 20,
        "output": "json",
    })
    docs = json.loads(text)["response"]["docs"]

    results = []
    for doc in docs:
        m = _IDENTIFIER_RE.match(doc["identifier"])
        if not m:
            continue
        doc_num = int(m.group(1))
        if doc_num != is_number:
            continue  # reject prefix false-positives like 1608 matching 16081
        results.append({
            "identifier": doc["identifier"],
            "title": doc.get("title", ""),
            "part": int(m.group(2)) if m.group(2) else None,
            "year": int(m.group(3)),
        })
    return results


def _pick_identifier(candidates: list[dict], part: Optional[str], year: Optional[int]) -> Optional[dict]:
    if not candidates:
        return None
    part_num = int(part) if part and part.isdigit() else None

    def matches_part(c):
        return c["part"] == part_num

    def matches_year(c):
        return year is not None and c["year"] == year

    for pred in (lambda c: matches_part(c) and matches_year(c), matches_part, matches_year):
        for c in candidates:
            if pred(c):
                return c
    # fall back to the most recent scan
    return max(candidates, key=lambda c: c["year"])


def fetch_scope_text(identifier: str) -> Optional[str]:
    """Download OCR text for an archive.org item and extract the Scope clause."""
    cache_file = _cache_path("djvu", f"{identifier}.txt")
    # The djvu.txt filename doesn't always mirror the full identifier;
    # discover it from metadata instead of guessing.
    meta_cache = _cache_path("metadata", f"{identifier}.json")
    meta_text = _get(f"https://archive.org/metadata/{identifier}", meta_cache)
    meta = json.loads(meta_text)
    txt_name = next((f["name"] for f in meta.get("files", []) if f["name"].endswith("_djvu.txt")), None)
    if not txt_name:
        return None

    download_url = f"https://archive.org/download/{identifier}/{txt_name}"
    ocr_text = _get(download_url, cache_file)
    return _extract_scope(ocr_text)


def _extract_scope(ocr_text: str) -> Optional[str]:
    """Pick the real "1 SCOPE" clause body out of the OCR text.

    The heading regex also matches the table-of-contents line (which reads
    like "1 Scope ... 11" -- a page number). We disambiguate by digit
    density: a TOC chunk is mostly short numeric tokens (page numbers,
    dotted sub-clause numbers with no prose); the real clause is prose with
    only the occasional "1.1"-style numbering.
    """
    candidates = []
    for m in _SCOPE_HEADING_RE.finditer(ocr_text):
        start = m.end()
        window = ocr_text[start:start + 6000]
        next_m = _NEXT_HEADING_RE.search(window)
        end = start + (next_m.start() if next_m else min(len(window), 2000))
        chunk = ocr_text[start:end].strip()
        chunk = _WHITESPACE_RE.sub(" ", chunk)
        chunk = re.sub(r"\s*\n\s*", " ", chunk).strip()
        # OCR sometimes garbles the "2" in the next heading (e.g. "% TERMINOLOGY");
        # a bare all-caps section keyword is still a reliable cutoff.
        next_section = re.search(r"\b(TERMINOLOGY|REFERENCES|SYMBOLS|DEFINITIONS)\b", chunk)
        if next_section:
            chunk = chunk[: next_section.start()].strip()
        words = chunk.split()
        if len(words) < 8:
            continue
        digit_ratio = sum(1 for w in words if w.strip(".,)(").isdigit()) / len(words)
        if digit_ratio > 0.15:
            continue  # looks like a table of contents, not prose
        candidates.append(chunk)

    if not candidates:
        return None
    return min(candidates, key=len)  # shortest clean candidate = the actual clause


def get_scope_and_year(is_number: int, part: Optional[str], known_year: Optional[int]) -> dict:
    """Best-effort lookup: returns dict with scope_text, year, identifier, confidence.

    All fields are None when nothing usable was found -- callers must not
    fabricate a fallback.
    """
    try:
        candidates = find_identifiers(is_number)
    except requests.RequestException:
        return {"scope_text": None, "year": None, "identifier": None}

    chosen = _pick_identifier(candidates, part, known_year)
    if not chosen:
        return {"scope_text": None, "year": None, "identifier": None}

    try:
        scope = fetch_scope_text(chosen["identifier"])
    except requests.RequestException:
        scope = None

    return {"scope_text": scope, "year": chosen["year"], "identifier": chosen["identifier"]}
