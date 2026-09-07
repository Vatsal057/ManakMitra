# ManakMitra

**AI-powered recommendation engine for identifying applicable Indian Standards
(IS) for procurement specifications.**

Smart India Hackathon problem statement **SIH26108** — Ministry of Consumer
Affairs, Food & Public Distribution, Department of Consumer Affairs (DoCA).

Procurement officials writing tender specifications have to cite the right
Indian Standards. With thousands of published standards, overlapping scopes and
frequent revisions, specifications routinely miss relevant standards or cite
withdrawn editions, which leads to ambiguity and procurement disputes.
ManakMitra takes a plain-language product description or tender clause and
returns the applicable Indian Standards, the allied and normative standards that
go with them, the latest edition and amendment count, and any mandatory
certification requirement.

```
"14.2 kg domestic LPG cooking gas cylinder with self closing valve"

  1. IS 8737:1995   0.61   [BIS Product Certification]
     Valve Fittings for Use with LPG Cylinders of More Than 5 Litre Water Capacity
  2. IS 7142:1995   0.43   [BIS Product Certification]
     Welded Low Carbon Steel Cylinders for Low Pressure Liquefiable Gases
```

## What it does

- **Semantic search, not keyword matching.** Sentence-transformer embeddings over
  standard titles, categories and scopes, searched with FAISS.
- **Allied standards.** Normative references, test methods, terminology, safety
  and installation standards for each recommended standard.
- **Latest version and amendments.** Edition year and amendment count, with
  withdrawn or superseded standards penalised in the ranking.
- **Certification requirements.** BIS Product Certification (ISI), CRS and
  Hallmarking, each with a stated basis and confidence level.
- **Multilingual input.** Hindi, Marathi, Bengali, Tamil and other Indian
  languages, translated before retrieval. Works offline via a procurement
  glossary; upgrades automatically when a translation API key is present.
- **Explainable ranking.** Every result carries `match_reasons` describing why it
  matched, so an official can judge the recommendation rather than trust it.

## Quick start

```bash
git clone https://github.com/Vatsal057/ManakMitra.git
cd ManakMitra

python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt

# CLI
.venv/bin/python -m ml.retrieval_pipeline --demo

# API  (docs at http://127.0.0.1:8000/docs)
.venv/bin/python -m uvicorn api.main:app --reload --port 8000
```

First run downloads the `all-MiniLM-L6-v2` model (about 90 MB) and caches
embeddings in `ml/.cache`, so later starts are fast.

```bash
curl -X POST http://127.0.0.1:8000/recommend \
  -H 'Content-Type: application/json' \
  -d '{"query":"PVC insulated copper wiring cable 1.5 sq mm","top_k":3}'
```

## Layout

```
ManakMitra/
├── data/                 datasets and curated mappings  (Tasks 1-2)
├── ml/                   retrieval pipeline             (Task 3)
│   ├── retrieval_pipeline.py    loading, embedding, ranking, CLI
│   ├── embeddings.py            three embedding backends with fallback
│   ├── allied.py                allied/normative standards lookup
│   └── README.md                pipeline docs and integration contract
├── api/                  FastAPI backend                (Task 4)
│   ├── main.py                  endpoints
│   ├── schemas.py               request/response models
│   ├── translation.py           multilingual support
│   └── README.md                API reference for the frontend
├── tests/                74 tests across data, pipeline and API
├── docs/                 problem statement, team plan, Task 2 audit reports
└── requirements.txt
```

## Tests

```bash
.venv/bin/python -m pytest tests/ -v
```

| File | Covers |
|---|---|
| `tests/test_allied_mapping.py` | Task 2's invariants, checked against both reports: 45 primaries and 142 mappings with per-primary counts, confidence and relationship distributions, the nine rejected pairings staying purged, the originally audited 15-primary set surviving expansion, and the nine documented coverage gaps staying deliberate |
| `tests/test_integration.py` | Standard-number parsing across all eleven observed formats, cross-file resolution between Tasks 1–3, and a guardrail per demo category |
| `tests/test_api.py` | Every endpoint, error envelope, CORS preflight, and multilingual retrieval |

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Readiness, dataset stats, active backends |
| POST | `/recommend` | Free text → ranked Indian Standards |
| GET | `/allied/{standard_number}` | Allied / normative standards, grouped by relationship |
| POST | `/translate` | Translate between English and Indian languages |
| GET | `/languages` | Language options for the UI selector |
| GET | `/demo-queries` | Curated demo queries, including Hindi |
| GET | `/standards/{standard_number}` | Single standard lookup, any number format |

Full request and response contract: [`api/README.md`](api/README.md).

## Task status

The team plan in [`docs/`](docs/SIH_BIS_Recommendation_Engine_Plan.md) splits the
work six ways.

| Task | Scope | Status |
|---|---|---|
| 1 | Standards dataset | **Done** — 226 standards across 15 categories |
| 2 | Allied standards mapping | **Done** — 142 mappings over 45 of 54 flagship products ([expansion report](docs/task2_allied_standards_expansion_batch_03.md), [audit report](docs/task2_allied_standards_finalization.md)) |
| 3 | Retrieval / ML pipeline | **Done** — semantic search, 322 standards indexed |
| 4 | Backend API | **Done** — 7 endpoints, 74 tests passing |
| 5 | Frontend | Not started |
| 6 | Integration, demo, pitch | Not started |

Verified coverage: all ten target demo categories return a relevant top hit —
cement 0.81, PPE helmet 0.79, LPG cylinder 0.71, toys 0.68, gold jewellery 0.67,
steel rebar 0.66, electrical cable 0.60, drinking water 0.59, IT equipment 0.54,
textiles 0.52. Warm queries answer in 10–13 ms.

## How ranking works

1. Embed each standard's title (weighted ×2), category and scope. Scope is
   skipped when it merely repeats the title, which is true for most scraped rows.
2. Cosine similarity search over a FAISS `IndexFlatIP`.
3. Rerank the top `4 × top_k`: boosts for category mentions, title-term overlap
   and applicable certification; penalty for withdrawn or superseded standards.
   Boosts are scaled by semantic similarity so metadata alone cannot lift an
   irrelevant standard.
4. A standard named outright in the query ("as per IS 456") is pinned to the top
   even when the embedding search misses it.

The pipeline degrades rather than failing: without `sentence-transformers` it
falls back to TF-IDF, then to a pure-numpy hashing vectoriser, and without
`faiss` it uses numpy brute force. `/health` reports which backend is live.

## Configuration

| Variable | Effect |
|---|---|
| `MANAKMITRA_DATASET` | Override the standards dataset path |
| `GOOGLE_TRANSLATE_API_KEY` | Enable Google Cloud Translation v2 |
| `LIBRETRANSLATE_URL` | Use a self-hosted LibreTranslate instance |
| `LIBRETRANSLATE_API_KEY` | Key for the above, if required |

## Accuracy and limitations

This is a hackathon prototype built on a curated subset of the BIS catalogue, not
an authoritative compliance tool. Specifics:

- **Coverage** is 322 standards, not the full BIS catalogue of several thousand.
- **Allied mappings** cover 45 of the 54 flagship products; the other 9 return
  `mapped: false`.
- **Certification tags** are a point-in-time snapshot. QCO and CRS notifications
  change; entries marked `confidence: medium` are indicative and surface as such
  in the API response.
- **Provenance.** Rows carry `needs_verification`, true for 193 of 322 — the
  source scrape often produced a scope shorter than 12 words, and allied-only
  rows take their titles from the mapping rather than from BIS directly. Anything
  used in a real specification should be checked against the BIS catalogue.
- **Amendment tracking** is static metadata, not a live feed from BIS.
- **The API is unauthenticated** and has no rate limiting. Fine on localhost;
  it needs an API key or gateway before any public deployment.

Standard numbers, titles and certification claims were checked against
[bis.gov.in](https://www.bis.gov.in) documents where marked `confidence: high`;
see [`data/README.md`](data/README.md) for per-file provenance.

## Problem statement

> Develop an AI-powered recommendation engine that integrates with procurement
> portals and assists procurement officials in identifying the most relevant
> Indian Standards and related standards while preparing tender specifications.

Full text: [`docs/SIH_BIS_Recommendation_Engine_Plan.md`](docs/SIH_BIS_Recommendation_Engine_Plan.md)
