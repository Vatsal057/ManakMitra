"""Allied / normative standards lookup (Task 2 data -> Task 4 API).

Task 2 produced ``allied_standards_mapping.json`` and ``flagship_products.json``.
Their standard numbers are written in whatever format the source used
(``IS 1786``, ``IS 269 - 2015``, ``IS 383-2016``), which does not always equal
the number the retrieval pipeline returns (``IS 1786:2008``). A plain dict
lookup therefore misses part of the mapping — 5 of 45 primaries at the time of
writing, and the affected set shifts whenever the dataset gains a better edition
of a standard.

Everything here resolves numbers through the same canonical parser the retrieval
pipeline uses, so any format matches any other format for the same standard.

Usage from the Task 4 backend::

    from ml.allied import get_allied_index

    index = get_allied_index()
    payload = index.allied_for("IS 1786:2008")   # or "IS 1786", or "IS 1786 - 2008"
    # -> {"primary_standard": ..., "product": ..., "groups": {...}, "total": 5}
"""

from __future__ import annotations

import json
import logging
from collections import OrderedDict
from pathlib import Path
from typing import Any, Dict, List, Optional

from ml.retrieval_pipeline import DATA_DIR, _canonical_key

logger = logging.getLogger(__name__)

ALLIED_MAPPING_PATH = DATA_DIR / "allied_standards_mapping.json"
FLAGSHIP_PRODUCTS_PATH = DATA_DIR / "flagship_products.json"

# Presentation order and labels for the relationship types Task 2 emits.
RELATIONSHIP_LABELS: "OrderedDict[str, str]" = OrderedDict(
    [
        ("normative_reference", "Normative references"),
        ("test_method", "Test methods"),
        ("terminology", "Terminology"),
        ("safety", "Safety"),
        ("installation_application", "Installation and application"),
        ("related_product", "Related product standards"),
    ]
)


def _load_json(path: Path) -> Any:
    if not path.exists():
        logger.warning("Allied data file not found: %s", path)
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Could not read %s (%s)", path, exc)
        return None


class AlliedIndex:
    """Canonical-number index over the Task 2 allied mapping and flagship list."""

    def __init__(
        self,
        mapping_path: Path | str = ALLIED_MAPPING_PATH,
        flagship_path: Path | str = FLAGSHIP_PRODUCTS_PATH,
    ):
        self.mapping_path = Path(mapping_path)
        self.flagship_path = Path(flagship_path)

        raw_mapping = _load_json(self.mapping_path) or []
        if isinstance(raw_mapping, dict):
            raw_mapping = raw_mapping.get("mappings") or raw_mapping.get("data") or []

        self.entries: List[Dict[str, Any]] = [e for e in raw_mapping if isinstance(e, dict)]
        self._by_key: Dict[str, Dict[str, Any]] = {}
        for entry in self.entries:
            number = str(entry.get("primary_standard") or "").strip()
            if number:
                self._by_key.setdefault(_canonical_key(number), entry)

        raw_flagship = _load_json(self.flagship_path) or []
        if isinstance(raw_flagship, dict):
            raw_flagship = raw_flagship.get("products") or raw_flagship.get("data") or []
        self.flagship: List[Dict[str, Any]] = [f for f in raw_flagship if isinstance(f, dict)]
        self._flagship_by_key: Dict[str, Dict[str, Any]] = {}
        for product in self.flagship:
            number = str(product.get("primary_standard") or "").strip()
            if number:
                self._flagship_by_key.setdefault(_canonical_key(number), product)

        logger.info(
            "Allied index: %d mapping(s), %d flagship product(s)",
            len(self._by_key), len(self._flagship_by_key),
        )

    # -- lookups ------------------------------------------------------------ #

    def has_mapping(self, standard_number: str) -> bool:
        return _canonical_key(standard_number) in self._by_key

    def product_for(self, standard_number: str) -> Optional[str]:
        """Flagship product name for a standard, if it is one of the selected ones."""
        key = _canonical_key(standard_number)
        entry = self._flagship_by_key.get(key) or self._by_key.get(key)
        return str(entry.get("product")) if entry else None

    def allied_for(self, standard_number: str) -> Dict[str, Any]:
        """Allied standards for a standard, grouped by relationship type.

        Returns a fully-formed payload even when nothing is mapped, so the API
        can return it directly without special-casing:
        ``{"primary_standard", "product", "groups", "total", "mapped"}``.
        """
        key = _canonical_key(standard_number)
        entry = self._by_key.get(key)
        if entry is None:
            return {
                "primary_standard": standard_number,
                "matched_standard": None,
                "product": self.product_for(standard_number),
                "groups": [],
                "total": 0,
                "mapped": False,
            }

        buckets: Dict[str, List[Dict[str, Any]]] = {}
        for item in entry.get("allied_standards", []):
            if not isinstance(item, dict):
                continue
            relationship = str(item.get("relationship") or "related_product").strip().lower()
            buckets.setdefault(relationship, []).append(
                {
                    "standard_number": str(item.get("standard") or "").strip(),
                    "title": str(item.get("title") or "").strip(),
                    "relationship": relationship,
                    "note": str(item.get("note") or "").strip(),
                    "confidence": str(item.get("confidence") or "medium").strip().lower(),
                }
            )

        # Known relationship types first, in a sensible reading order, then any
        # unexpected type Task 2 may add later.
        ordered_keys = [k for k in RELATIONSHIP_LABELS if k in buckets]
        ordered_keys += [k for k in sorted(buckets) if k not in RELATIONSHIP_LABELS]

        groups = [
            {
                "relationship": key_,
                "label": RELATIONSHIP_LABELS.get(key_, key_.replace("_", " ").capitalize()),
                "standards": buckets[key_],
                "count": len(buckets[key_]),
            }
            for key_ in ordered_keys
        ]
        return {
            "primary_standard": standard_number,
            "matched_standard": entry.get("primary_standard"),
            "product": entry.get("product"),
            "groups": groups,
            "total": sum(g["count"] for g in groups),
            "mapped": True,
        }

    def attach_to_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Annotate recommendation results with allied-standard availability.

        Adds ``has_allied``, ``allied_count`` and ``flagship_product`` so the UI
        can decide whether to render an expandable "Allied & Normative
        Standards" section before making a second API call.
        """
        for item in results:
            payload = self.allied_for(item.get("standard_number", ""))
            item["has_allied"] = payload["mapped"]
            item["allied_count"] = payload["total"]
            item["flagship_product"] = payload["product"]
        return results

    def unresolved_references(self, dataset_keys: set[str]) -> List[Dict[str, str]]:
        """Allied standards that are cited but absent from the standards dataset.

        Useful as a to-do list for Task 1, and as the input for making these
        standards searchable (see ``allied_rows``).
        """
        missing: Dict[str, Dict[str, str]] = {}
        for entry in self.entries:
            for item in entry.get("allied_standards", []):
                number = str(item.get("standard") or "").strip()
                if not number:
                    continue
                key = _canonical_key(number)
                if key in dataset_keys or key in missing:
                    continue
                missing[key] = {
                    "standard_number": number,
                    "title": str(item.get("title") or "").strip(),
                    "relationship": str(item.get("relationship") or "").strip(),
                    "cited_by": str(entry.get("primary_standard") or "").strip(),
                }
        return sorted(missing.values(), key=lambda r: r["standard_number"])

    def allied_rows(self, dataset_keys: set[str]) -> List[Dict[str, Any]]:
        """Dataset-shaped rows for cited-but-missing allied standards.

        These are added to the search index so that a query like "bend test for
        rebar" can surface IS 1599 even though the scraped dataset never had it.
        Titles come from Task 2's mapping, so they are marked for review.
        """
        rows = []
        for ref in self.unresolved_references(dataset_keys):
            if not ref["title"]:
                continue
            relationship = ref["relationship"].replace("_", " ")
            rows.append(
                {
                    "standard_number": ref["standard_number"],
                    "title": ref["title"],
                    "scope_description": (
                        f"{ref['title']}. Cited by {ref['cited_by']} as "
                        f"a {relationship} standard."
                    ),
                    "category": "Allied / Referenced",
                    "certification_type": "None",
                    "status": "active",
                    "source": "allied_mapping",
                    "needs_review": True,
                    "review_reason": "title and scope taken from the allied mapping, not from BIS",
                }
            )
        return rows


_INDEX: Optional[AlliedIndex] = None


def get_allied_index(reload: bool = False) -> AlliedIndex:
    """Process-wide allied index, built on first use."""
    global _INDEX
    if _INDEX is None or reload:
        _INDEX = AlliedIndex()
    return _INDEX


def allied_for(standard_number: str) -> Dict[str, Any]:
    """Convenience wrapper for the Task 4 ``/allied/{standard_number}`` endpoint."""
    return get_allied_index().allied_for(standard_number)
