# Task 3 — Retrieval / ML pipeline

Semantic search over Indian Standards. Takes a free-text product description or
tender clause, returns ranked IS standards with scores, versions, certification
tags and a short explanation of why each matched.

## Setup

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Only `numpy` is strictly required — the pipeline degrades to a lexical backend
if `sentence-transformers` or `faiss` are missing, so the API never hard-fails.

## Integration for Task 4 (backend)

```python
from ml.retrieval_pipeline import recommend_standards, get_recommender

results = recommend_standards("supply of 53 grade OPC cement in 50 kg bags", top_k=5)
health = get_recommender().info()   # for /health
```

`recommend_standards` builds the index lazily on the first call (a few seconds
for model load), then answers from memory. It is safe to import at module scope.

Result fields, all JSON-serialisable:

| field | notes |
|---|---|
| `rank`, `standard_number`, `title` | `standard_number` is the dataset's own format, e.g. `IS 269 - 2015` |
| `similarity_score` | raw cosine similarity, 0..1 |
| `score` | after rerank boosts, 0..1 — use this for the UI bar |
| `category`, `status` | `status` is `active` unless the dataset says otherwise |
| `latest_version`, `amendments`, `year` | `amendments` is an int or `null` |
| `certification_type` | `BIS Product Certification` / `CRS` / `Hallmarking` / `None` |
| `certification_basis` | why the scheme applies (QCO / CRS notification / hallmarking order) |
| `certification_confidence` | `high` = checked against a bis.gov.in document, `medium` = indicative. Label `medium` as indicative in the UI |
| `certification_reference` | source URL, when one was recorded |
| `scope_snippet` | trimmed to 240 chars |
| `match_reasons` | list of human-readable strings — good for the "why this?" UI |
| `needs_verification` | `true` when the dataset row is unreviewed; show a caution flag |
| `also_known_as` | other number formats merged into this row |
| `retrieval_mode` | `semantic` or `lexical` (fallback backend active) |
| `canonical_key` | format-independent identity, e.g. `IS1786|`. Use this to join against Task 2's files |
| `has_allied`, `allied_count` | whether a Task 2 allied mapping exists, and how many entries |
| `flagship_product` | product name when the standard is one of Task 2's flagship selections |

Empty or whitespace-only queries return `[]`. `top_k` is clamped to
`1..len(dataset)`. If the top `score` is below `MIN_SCORE` (0.05), treat it as
"no strong match" in the UI.

## CLI

```bash
.venv/bin/python -m ml.retrieval_pipeline --demo                 # built-in demo queries
.venv/bin/python -m ml.retrieval_pipeline -q "your spec text"    # one-off, repeatable
.venv/bin/python -m ml.retrieval_pipeline --interactive          # REPL
.venv/bin/python -m ml.retrieval_pipeline -q "cement" --json     # machine-readable
.venv/bin/python -m ml.retrieval_pipeline --backend tfidf -v     # force a backend
```

## Dataset

Three files combine into the live index:

1. **Primary** — resolved in this order, first hit wins: `data/is_standards.json`,
   `data/is_standards.csv`, `data/bis_standards_dataset.json`,
   `data/bis_standards_dataset.csv`. Override with `--dataset` or
   `$MANAKMITRA_DATASET`.
2. **Supplement** — `data/curated_standards_supplement.json`, 36 hand-curated
   rows covering the categories the scraped dataset misses (cables, LPG
   cylinders, toys, drinking water, IT/electronics, jewellery) plus current
   editions of some flagship civil standards. Merged by canonical standard
   number, so a curated row and a scraped row for the same standard collapse
   into one entry and the curated text wins.
3. **Certification overlay** — `data/certification_map.json`, keyed by base IS
   number, fills `certification_type` because the scraped dataset has no such
   column. A real `certification_type` in the dataset always beats the overlay,
   so this disappears on its own once Task 1 adds the column.

4. **Allied references** — standards cited by `data/allied_standards_mapping.json`
   that are missing from the dataset are added as searchable rows. See below.

Current totals: 226 scraped + 40 curated + 64 allied-only → 322 standards after
merging, of which 55 carry a certification scheme (47 ISI / 5 CRS / 3
Hallmarking).

Each certification entry records a `basis` and a `confidence`. Entries marked
`medium` should be presented as indicative, not as compliance advice — the
pipeline already appends "(indicative)" to those match reasons.

The loader tolerates messy input: it maps alias columns (`year_published`,
`scope`, `sector`, `is_number`, ...), parses the six standard-number formats
present in the current dataset, drops implausible years, splits
`"Amendments: 6"` out of `latest_version`, and merges duplicate rows that
describe the same standard (`IS: 3495` + `IS 3495 (Parts I TO iv) 1976`).

## Allied standards (Task 2 data)

`ml/allied.py` wraps `data/allied_standards_mapping.json` and
`data/flagship_products.json`. Use it for the `/allied/{standard_number}` endpoint:

```python
from ml.allied import allied_for

payload = allied_for("IS 1786:2008")   # any number format resolves
```

```jsonc
{
  "primary_standard": "IS 1786:2008",   // what was asked for
  "matched_standard": "IS 1786",        // the key that matched in the mapping
  "product": "High Strength Deformed (TMT / HYSD) Steel Rebar",
  "groups": [
    { "relationship": "test_method", "label": "Test methods", "count": 3,
      "standards": [ { "standard_number": "IS 1599:2012", "title": "...",
                       "relationship": "test_method", "note": "...",
                       "confidence": "high" } ] }
  ],
  "total": 5,
  "mapped": true
}
```

**Do not look standards up by raw string.** Task 2's numbers are written
differently from the pipeline's (`IS 1786` vs `IS 1786:2008`, `IS 383-2016` vs
`IS 383:2016`); 5 of the 45 mappings fail an exact string match, and which ones
shift whenever the dataset gains a better edition of a standard. Everything in
`ml/allied.py` resolves through the same canonical parser, so all formats work.
An unmapped standard returns the same shape with `mapped: false` and an empty
`groups` list, so the endpoint needs no special-casing.

Groups come back in reading order: normative references, test methods,
terminology, safety, installation and application, related products. Each entry
carries Task 2's own `confidence` — surface `medium` as unverified.

The mapping cites 64 standards that are not in the scraped dataset (IS 1599 bend
test, IS 228 chemical analysis, IS 800 steel design code, ...). Those are added
to the search index as rows in category "Allied / Referenced" with
`needs_verification: true`, so they are searchable rather than only reachable
through the allied endpoint. Pass `include_allied=False` to `load_standards` to
turn that off.

Current coverage: **45 primary standards with 142 allied mappings**, covering 45
of the 54 flagship products. The remaining 9 return `mapped: false`, so the UI
should still gate the allied section on `has_allied`.

## How ranking works

1. Embed `title` (weighted ×2) + `category` + `scope_description`. Scope is
   skipped when it is a near-copy of the title, which is the case for most rows
   in the current dataset.
2. Cosine similarity search over a FAISS `IndexFlatIP` (numpy fallback).
3. Rerank the top `4 × top_k`: category-mention boost, title-overlap boost,
   small certification boost, penalty for `withdrawn`/`superseded`.
4. A standard named outright in the query (`"as per IS 456"`) is pinned to the
   top even if the embedding search misses it.

Tuning constants live at the top of `retrieval_pipeline.py`.

## Known limits

- 155 of 322 rows still have a scope shorter than 12 words (the scraper mostly
  copied the title into `scope_description`). Ranking works, but richer scope
  text from Task 1 would improve it measurably.
- 267 rows carry no certification tag. That is usually correct — codes of
  practice and test-method standards are not certifiable — but the overlay is
  not exhaustive either.
- Roughly 15% of scraped rows are in the wrong category (soil tests filed under
  "Water & Environment", a steel wire standard under "Electrical"). Metadata
  boosts are scaled by semantic similarity so a bad category cannot pull an
  irrelevant standard into the top results.
- `needs_verification` is true for 193 rows, which includes every allied-only
  row, since their titles come from the mapping rather than from BIS directly.
  Anything shown live should be spot checked against the BIS catalogue first.

## Tests

```bash
.venv/bin/python -m pytest tests/ -v
```

72 tests covering number-format parsing, the Task 2 mapping's audited
invariants, cross-file resolution, retrieval guardrails for each demo category,
and every API endpoint.

## Verified demo coverage

All ten plan demo categories return a relevant top hit (score in brackets):
cement 0.81, PPE helmet 0.79, LPG cylinder 0.71, toys 0.68, gold jewellery 0.67,
steel rebar 0.66, electrical cable 0.60, drinking water 0.59, IT equipment 0.54,
textiles 0.52.
