"""Sync backend/data/i18n/*.json against en.json (the source of truth).

Workflow: a human edits en.json only, then runs this script. For every key
in en.json, for every non-English language:

  - missing in that language              -> NLLB-translate, source="machine"
  - en_hash matches stored entry          -> up to date, skip
  - en_hash differs, source == "machine"  -> English changed, re-translate
  - en_hash differs, source == "human"    -> report only, never overwrite
  - key present in the language but no    -> report as orphaned, never
    longer in en.json                        delete without confirmation

Hard rule: certification values (incl. "Not determined"), confidence bands,
and abstention messaging are never machine-translated. If a protected key is
missing a human translation, report it -- do not fill it.

Run with --dry-run to see the summary without calling NLLB or writing files
(NLLB is a ~2.4GB model; --dry-run is the fast path for CI/inspection).
Add --apply to actually translate and write.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
I18N_DIR = ROOT / "data" / "i18n"
LANGS = ["hi", "ta", "te", "bn", "mr", "gu", "kn"]

# Same categorization used when the i18n files were first built (Part 3.1) --
# key-name based so it also covers keys that are entirely MISSING from a
# language file (where there's no stored "protected" flag to read).
_ABSTENTION_KEYS = {"noMatchesTitle", "noMatchesDesc"}


def is_protected_key(key: str) -> bool:
    return (
        key.startswith("certification.")
        or key.startswith("confidenceBand.")
        or key in _ABSTENTION_KEYS
    )


def sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


def sync_language(lang: str, en_map: dict, lang_map: dict, translate_fn) -> tuple[dict, dict]:
    """Returns (new_lang_map, counts). `translate_fn(en_text, lang) -> str`
    is injected so tests can run this without loading the real NLLB model."""
    counts = {
        "up_to_date": 0,
        "machine_filled": 0,
        "stale_human_needs_review": 0,
        "protected_missing": 0,
        "orphaned": 0,
    }
    new_map = dict(lang_map)

    for key, en_value in en_map.items():
        en_hash = sha256(en_value)
        entry = lang_map.get(key)
        protected = is_protected_key(key) or (isinstance(entry, dict) and entry.get("protected"))

        if entry is None:
            if protected:
                counts["protected_missing"] += 1
                continue
            translated = translate_fn(en_value, lang)
            new_map[key] = {"value": translated, "source": "machine", "en_hash": en_hash}
            counts["machine_filled"] += 1
            continue

        if entry.get("en_hash") == en_hash:
            counts["up_to_date"] += 1
            continue

        # en_hash differs -- English changed since this translation was made.
        if protected:
            # Protected + stale is still a "needs a human" situation, never
            # auto-filled -- surfaced the same way as protected_missing.
            counts["protected_missing"] += 1
            continue
        if entry.get("source") == "human":
            counts["stale_human_needs_review"] += 1
            continue
        # source == "machine" and stale -> re-translate.
        translated = translate_fn(en_value, lang)
        new_entry = dict(entry)
        new_entry.update(value=translated, source="machine", en_hash=en_hash)
        new_map[key] = new_entry
        counts["machine_filled"] += 1

    for key in lang_map:
        if key not in en_map:
            counts["orphaned"] += 1

    return new_map, counts


def main() -> None:
    # Windows consoles default to cp1252 -- this script prints native-script
    # summaries, so force UTF-8 stdout instead of crashing on the first line.
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Actually translate via NLLB and write files (default: dry-run report only).")
    args = parser.parse_args()

    en_map = load_json(I18N_DIR / "en.json")
    if not en_map:
        print(f"en.json not found or empty at {I18N_DIR / 'en.json'}")
        return

    if args.apply:
        from translation.nllb_provider import generate_native_query

        def translate_fn(text: str, lang: str) -> str:
            return generate_native_query(text, lang)
    else:
        def translate_fn(text: str, lang: str) -> str:
            return text  # placeholder value, never written in dry-run mode

    grand_totals = {"up_to_date": 0, "machine_filled": 0, "stale_human_needs_review": 0, "protected_missing": 0, "orphaned": 0}

    for lang in LANGS:
        path = I18N_DIR / f"{lang}.json"
        lang_map = load_json(path)
        new_map, counts = sync_language(lang, en_map, lang_map, translate_fn)

        print(f"\n[{lang}] up_to_date={counts['up_to_date']} "
              f"machine_filled={counts['machine_filled']} "
              f"stale_human_needs_review={counts['stale_human_needs_review']} "
              f"protected_missing={counts['protected_missing']} "
              f"orphaned={counts['orphaned']}")

        for total_key in grand_totals:
            grand_totals[total_key] += counts[total_key]

        if args.apply and counts["machine_filled"] > 0:
            save_json(path, new_map)
            print(f"  wrote {path}")
        elif not args.apply:
            print("  (dry-run -- no files written, no NLLB calls made)")

    print(f"\nTOTAL across {len(LANGS)} languages: "
          f"up_to_date={grand_totals['up_to_date']} "
          f"machine_filled={grand_totals['machine_filled']} "
          f"stale_human_needs_review={grand_totals['stale_human_needs_review']} "
          f"protected_missing={grand_totals['protected_missing']} "
          f"orphaned={grand_totals['orphaned']}")

    if grand_totals["stale_human_needs_review"]:
        print("\nACTION NEEDED: stale human translations above were NOT overwritten -- review by hand.")
    if grand_totals["protected_missing"]:
        print("ACTION NEEDED: protected keys above are missing/stale and were NOT machine-filled -- add a human translation.")
    if grand_totals["orphaned"]:
        print("NOTE: orphaned keys above exist in a language file but not en.json -- not deleted automatically.")


if __name__ == "__main__":
    main()
