"""Integrity tests for the Task 2 allied standards mapping.

Adapted from the Task 2 owner's suite (`test_verified_mapping.py`), which ran
inside that team member's own repo and read intermediate audit artefacts:

    data/verified/allied_standards_mapping.json
    data/raw/allied_standards_research_audited.json
    data/raw/allied_standards_research_batch_02_audited.json

Only the promoted deliverable was handed over, so the two `data/raw/` audit
files do not exist here. The rejected-pairing check is preserved by pinning the
nine purged pairs and the one MANUAL_VERIFY exclusion listed in section 3 of
docs/task2_allied_standards_finalization.md, rather than deriving them from the
raw files.

Run: .venv/bin/python -m pytest tests/ -v
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MAPPING_PATH = PROJECT_ROOT / "data" / "allied_standards_mapping.json"
FLAGSHIP_PATH = PROJECT_ROOT / "data" / "flagship_products.json"

# Expanded mapping delivered after the batch 01/02 finalization report. The
# report's own metrics (15 primaries / 53 mappings) describe the earlier
# revision; that set is preserved intact as a subset of this one, which
# test_expanded_mapping_preserves_the_audited_subset checks.
EXPECTED_PRIMARY_STANDARDS = 45
EXPECTED_ALLIED_MAPPINGS = 142
EXPECTED_CONFIDENCE = {"high": 140, "medium": 2, "low": 0}
EXPECTED_RELATIONSHIPS = {
    "test_method": 68,
    "installation_application": 31,
    "normative_reference": 29,
    "safety": 14,
    "terminology": 0,
}

# The 15 primaries and 53 pairings promoted by the audited batches. None may be
# lost when the mapping is expanded.
AUDITED_PRIMARIES = {
    "IS 1786", "IS 269 - 2015", "IS 456", "IS 383-2016", "IS 1077 - 1992",
    "IS 2925", "IS 4151", "IS 2997", "IS 3156-3", "IS 368", "IS 302-2-3",
    "IS 1364-3", "IS 3063", "IS 260", "IS 3771 : 2019",
}
AUDITED_MAPPING_COUNT = 53

ALLOWED_RELATIONSHIPS = {
    "normative_reference",
    "test_method",
    "terminology",
    "safety",
    "installation_application",
}
ALLOWED_CONFIDENCES = {"high", "medium", "low"}

# Section 3.1 — invalid pairings purged during the audit. These must never
# reappear if the mapping is regenerated.
REJECTED_PAIRS = {
    ("IS 2925", "IS 4151"),        # industrial helmet != motorcycle helmet
    ("IS 4151", "IS 2925"),        # symmetrical invalid pairing
    ("IS 3156-3", "IS 4201"),      # CT application guide mapped to a VT standard
    ("IS 3156-3", "IS 3188"),      # co-procurement, not an allied standard
    ("IS 368", "IS 4160"),         # domestic heater != industrial interlocked socket
    ("IS 302-2-3", "IS 368"),      # QCO co-occurrence, not an allied standard
    ("IS 1364-3", "IS 2636"),      # structural hex nuts != wing nuts
    ("IS 3063", "IS 3075-2"),      # lock washers != circlips
    ("IS 3771 : 2019", "IS 1242"), # hospital bed sheeting != apparel shirting
}

# Section 3.2 — excluded pending physical amendment-sheet verification.
MANUAL_VERIFY_EXCLUSIONS = {("IS 260", "IS 1070:1992")}


@pytest.fixture(scope="module")
def mapping() -> list[dict]:
    assert MAPPING_PATH.exists(), f"Missing allied mapping: {MAPPING_PATH}"
    return json.loads(MAPPING_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def flagship_standards() -> set[str]:
    assert FLAGSHIP_PATH.exists(), f"Missing flagship products: {FLAGSHIP_PATH}"
    products = json.loads(FLAGSHIP_PATH.read_text(encoding="utf-8"))
    return {p["primary_standard"] for p in products}


@pytest.fixture(scope="module")
def allied_entries(mapping) -> list[dict]:
    return [a for entry in mapping for a in entry["allied_standards"]]


def test_root_is_a_list(mapping):
    assert isinstance(mapping, list), "Root element must be a list"


def test_primary_standard_count(mapping):
    assert len(mapping) == EXPECTED_PRIMARY_STANDARDS


def test_allied_mapping_count(allied_entries):
    assert len(allied_entries) == EXPECTED_ALLIED_MAPPINGS


def test_no_duplicate_primary_standards(mapping):
    numbers = [entry["primary_standard"] for entry in mapping]
    duplicates = {n for n in numbers if numbers.count(n) > 1}
    assert not duplicates, f"Duplicate primary standards: {duplicates}"


def test_every_primary_is_a_flagship_product(mapping, flagship_standards):
    orphans = [
        entry["primary_standard"]
        for entry in mapping
        if entry["primary_standard"] not in flagship_standards
    ]
    assert not orphans, f"Primary standards absent from flagship_products.json: {orphans}"


def test_required_keys_present_and_non_empty(mapping):
    for entry in mapping:
        for key in ("primary_standard", "product", "allied_standards"):
            assert key in entry, f"Missing {key} in {entry.get('primary_standard', '?')}"
        assert isinstance(entry["allied_standards"], list)
        assert entry["allied_standards"], f"No allied standards for {entry['primary_standard']}"

        for allied in entry["allied_standards"]:
            for key in ("standard", "title", "relationship", "note", "confidence"):
                assert key in allied, f"Missing {key} in an allied entry of {entry['primary_standard']}"
                assert isinstance(allied[key], str), f"{key} must be a string"
                assert allied[key].strip(), f"{key} must not be empty"


def test_relationship_values_are_allowed(allied_entries):
    invalid = {a["relationship"] for a in allied_entries} - ALLOWED_RELATIONSHIPS
    assert not invalid, f"Invalid relationship types: {invalid}"


def test_confidence_values_are_allowed(allied_entries):
    invalid = {a["confidence"] for a in allied_entries} - ALLOWED_CONFIDENCES
    assert not invalid, f"Invalid confidence values: {invalid}"


def test_no_duplicate_allied_pairs(mapping):
    seen: set[tuple[str, str, str]] = set()
    for entry in mapping:
        for allied in entry["allied_standards"]:
            key = (entry["primary_standard"], allied["standard"], allied["relationship"])
            assert key not in seen, f"Duplicate allied pair: {key}"
            seen.add(key)


def test_rejected_pairings_stay_purged(mapping):
    present = {
        (entry["primary_standard"], allied["standard"])
        for entry in mapping
        for allied in entry["allied_standards"]
    }
    leaked = REJECTED_PAIRS & present
    assert not leaked, f"Audit-rejected pairings present in the mapping: {leaked}"


def test_manual_verify_exclusions_stay_excluded(mapping):
    present = {
        (entry["primary_standard"], allied["standard"])
        for entry in mapping
        for allied in entry["allied_standards"]
    }
    leaked = MANUAL_VERIFY_EXCLUSIONS & present
    assert not leaked, f"MANUAL_VERIFY entries present in the mapping: {leaked}"


def test_expanded_mapping_preserves_the_audited_subset(mapping):
    """The 15 audited primaries must survive every later expansion.

    The batch 01/02 audits are the most rigorously verified part of this data.
    An expansion that quietly dropped them would lose that provenance while the
    headline counts still went up.
    """
    present = {entry["primary_standard"] for entry in mapping}
    lost = AUDITED_PRIMARIES - present
    assert not lost, f"Expansion dropped audited primary standards: {lost}"

    audited_pair_count = sum(
        len(entry["allied_standards"])
        for entry in mapping
        if entry["primary_standard"] in AUDITED_PRIMARIES
    )
    assert audited_pair_count >= AUDITED_MAPPING_COUNT, (
        f"Audited primaries now carry {audited_pair_count} mappings, "
        f"down from {AUDITED_MAPPING_COUNT}"
    )


def test_flagship_coverage_is_reported_accurately(mapping, flagship_standards):
    """Pins the mapped/unmapped split that the UI and pitch quote."""
    mapped = {entry["primary_standard"] for entry in mapping} & flagship_standards
    assert len(flagship_standards) == 54
    assert len(mapped) == 45, f"Expected 45 of 54 flagship products mapped, got {len(mapped)}"


def test_confidence_distribution_matches_report(allied_entries):
    counts = {level: 0 for level in ALLOWED_CONFIDENCES}
    for allied in allied_entries:
        counts[allied["confidence"]] += 1
    assert counts == EXPECTED_CONFIDENCE


def test_relationship_distribution_matches_report(allied_entries):
    counts = {rel: 0 for rel in EXPECTED_RELATIONSHIPS}
    for allied in allied_entries:
        counts[allied["relationship"]] = counts.get(allied["relationship"], 0) + 1
    assert counts == EXPECTED_RELATIONSHIPS


def test_notes_cite_a_reason(allied_entries):
    """Every mapping should justify itself, not just assert a link."""
    too_short = [
        (a["standard"], a["note"]) for a in allied_entries if len(a["note"].split()) < 5
    ]
    assert not too_short, f"Allied entries with an uninformative note: {too_short}"
