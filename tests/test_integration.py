"""Cross-task wiring tests.

These cover the seam the Task 2 suite could not reach, because it ran in a
separate repo against the mapping file alone: whether Task 2's standard numbers
actually resolve against Task 1's dataset once Task 3 has loaded it, and whether
the Task 4 endpoints return what the frontend expects.

The number formats differ between files by design (`IS 1786` vs `IS 1786:2008`
vs `IS 383-2016`), so these tests exist to catch a regression in the canonical
number parser that would silently empty the allied section in the UI.

Run: .venv/bin/python -m pytest tests/ -v
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml.allied import get_allied_index
from ml.retrieval_pipeline import _canonical_key, _parse_number, get_recommender

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def recommender():
    return get_recommender()


@pytest.fixture(scope="module")
def allied_index():
    return get_allied_index()


@pytest.fixture(scope="module")
def dataset_keys(recommender) -> set[str]:
    return {_canonical_key(r["standard_number"]) for r in recommender.standards}


# --------------------------------------------------------------------------- #
# Number parsing — the join key everything else depends on
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize(
    "number,expected",
    [
        ("IS 269 - 2015", ("269", "", 2015)),
        ("IS: 9103", ("9103", "", None)),
        ("IS 4375 : 2019", ("4375", "", 2019)),
        ("IS 302 :", ("302", "", None)),
        ("IS 2911-1-1", ("2911", "1.1", None)),
        ("IS 432 (P II) 1966", ("432", "2", 1966)),
        ("IS:2720 (Part.29) 1975", ("2720", "29", 1975)),
        ("IS 3495 (Parts I TO iv) 1976", ("3495", "", 1976)),  # multi-part list -> parent
        ("IS 9873 (Part 1):2019", ("9873", "1", 2019)),
        ("IS 2090", ("2090", "", None)),  # must not read 2090 as a year
        ("IS 383-2016", ("383", "", 2016)),  # trailing year, not a part
    ],
)
def test_number_parsing(number, expected):
    assert _parse_number(number) == expected


@pytest.mark.parametrize(
    "variants",
    [
        ["IS 1786", "IS 1786:2008", "IS 1786 - 2008", "IS:1786", "is 1786"],
        ["IS 383-2016", "IS 383:2016", "IS 383 - 2016", "IS: 383"],
        ["IS 456", "IS 456:2000", "IS:456"],
    ],
)
def test_number_formats_share_one_canonical_key(variants):
    keys = {_canonical_key(v) for v in variants}
    assert len(keys) == 1, f"Formats disagreed on canonical key: {keys}"


def test_parts_stay_distinct_from_parent():
    assert _canonical_key("IS 3495") != _canonical_key("IS 3495-1")
    assert _canonical_key("IS 9873 (Part 1):2019") != _canonical_key("IS 9873 (Part 3):2017")


# --------------------------------------------------------------------------- #
# Task 2 -> Task 1/3: every mapping resolves
# --------------------------------------------------------------------------- #

def test_every_allied_primary_resolves_to_a_dataset_row(allied_index, dataset_keys):
    unresolved = [
        entry["primary_standard"]
        for entry in allied_index.entries
        if _canonical_key(entry["primary_standard"]) not in dataset_keys
    ]
    assert not unresolved, f"Allied mapping primaries missing from the dataset: {unresolved}"


def test_every_flagship_primary_resolves_to_a_dataset_row(allied_index, dataset_keys):
    unresolved = [
        product["primary_standard"]
        for product in allied_index.flagship
        if _canonical_key(product["primary_standard"]) not in dataset_keys
    ]
    assert not unresolved, f"Flagship primaries missing from the dataset: {unresolved}"


def test_allied_lookup_works_for_every_mapped_primary(allied_index):
    for entry in allied_index.entries:
        payload = allied_index.allied_for(entry["primary_standard"])
        assert payload["mapped"], f"Lookup failed for {entry['primary_standard']}"
        assert payload["total"] == len(entry["allied_standards"])
        assert payload["groups"], f"No groups built for {entry['primary_standard']}"


def test_allied_lookup_is_format_independent(allied_index, recommender):
    """The number the pipeline returns must find the mapping Task 2 keyed differently."""
    for entry in allied_index.entries:
        key = _canonical_key(entry["primary_standard"])
        row = next(
            (r for r in recommender.standards if _canonical_key(r["standard_number"]) == key),
            None,
        )
        assert row is not None
        # Look up using the pipeline's own display format, not Task 2's.
        payload = allied_index.allied_for(row["standard_number"])
        assert payload["mapped"], (
            f"Task 2 keyed {entry['primary_standard']!r} but the pipeline returns "
            f"{row['standard_number']!r} and the lookup missed"
        )


def test_unmapped_standard_returns_a_usable_shape(allied_index):
    payload = allied_index.allied_for("IS 99999")
    assert payload["mapped"] is False
    assert payload["groups"] == []
    assert payload["total"] == 0
    assert "primary_standard" in payload


def test_allied_cited_standards_are_searchable(dataset_keys, allied_index):
    """Standards cited by Task 2 get ingested so they are not dead references."""
    missing = allied_index.unresolved_references(dataset_keys)
    assert not missing, f"Cited allied standards absent from the index: {[m['standard_number'] for m in missing]}"


# --------------------------------------------------------------------------- #
# Retrieval quality guardrails
# --------------------------------------------------------------------------- #

def test_dataset_has_no_implausible_years(recommender):
    bad = [
        (r["standard_number"], r["year"])
        for r in recommender.standards
        if r.get("year") is not None and not 1900 <= r["year"] <= 2027
    ]
    assert not bad, f"Implausible years survived loading: {bad}"


def test_no_duplicate_canonical_keys_in_dataset(recommender):
    keys = [_canonical_key(r["standard_number"]) for r in recommender.standards]
    duplicates = {k for k in keys if keys.count(k) > 1}
    assert not duplicates, f"Duplicate standards after merging: {duplicates}"


@pytest.mark.parametrize(
    "query,expected_standard",
    [
        ("ordinary portland cement 53 grade for concrete", "269"),
        ("deformed reinforcement steel bars Fe500 for RCC", "1786"),
        ("domestic LPG gas cylinder valve fitting", "8737"),
        ("PVC insulated copper wiring cable 1100 volt", "1554"),
        ("children plastic toys safety", "9873"),
        ("packaged drinking water bottle", "14543"),
        ("laptop computer safety requirements", "13252"),
        ("gold jewellery hallmarking fineness", "1417"),
        ("industrial safety helmet for workers", "2925"),
    ],
)
def test_demo_categories_return_the_right_standard(recommender, query, expected_standard):
    """Guards the demo. A regression here means a live query goes wrong on stage."""
    results = recommender.recommend(query, top_k=3)
    bases = [r["standard_number"] for r in results]
    assert any(
        _parse_number(n)[0] == expected_standard for n in bases
    ), f"Expected IS {expected_standard} in the top 3 for {query!r}, got {bases}"


def test_explicitly_named_standard_is_pinned(recommender):
    results = recommender.recommend("materials shall conform to IS 456", top_k=3)
    assert _parse_number(results[0]["standard_number"])[0] == "456"
    assert results[0]["score"] == 1.0


def test_empty_query_returns_nothing(recommender):
    assert recommender.recommend("", top_k=5) == []
    assert recommender.recommend("   ", top_k=5) == []


def test_results_are_json_serialisable_and_ranked(recommender):
    results = recommender.recommend("cement for foundation", top_k=5)
    json.dumps(results)  # must not raise
    assert [r["rank"] for r in results] == list(range(1, len(results) + 1))
    scores = [r["score"] for r in results]
    assert scores == sorted(scores, reverse=True)


def test_certification_tags_are_present_and_justified(recommender):
    tagged = [
        r
        for r in recommender.standards
        if str(r.get("certification_type", "None")).lower() not in {"none", ""}
    ]
    assert len(tagged) >= 50, f"Only {len(tagged)} standards carry a certification scheme"
    unjustified = [r["standard_number"] for r in tagged if not r.get("certification_basis")]
    assert not unjustified, f"Certification tags without a stated basis: {unjustified}"
