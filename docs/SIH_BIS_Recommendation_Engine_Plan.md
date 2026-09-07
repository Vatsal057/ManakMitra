# SIH26108 — AI-Powered Recommendation Engine for Applicable Indian Standards (Procurement Specifications)

## Problem Statement (as given)

**Title:** AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications

**Organization:** Ministry of Consumer Affairs, Food & Public Distribution
**Department:** Department of Consumer Affairs (DoCA)
**Category:** Software
**Theme:** Smart Automation

### Background
Government departments, Public Sector Enterprises (PSEs), procurement agencies, and private organizations procure a wide range of products and services through e-procurement portals. Procurement officials are often required to prepare technical specifications that reference the appropriate Indian Standards (IS). However, identifying the correct standard(s) is challenging due to the large number of published standards, overlapping scopes, frequent revisions, and the need to consider associated or normative reference standards. Consequently, tender specifications may omit relevant standards, reference outdated versions, or include incomplete technical requirements, leading to ambiguity, reduced product quality, and procurement disputes.

An intelligent system is required that can automatically analyze a product description or technical specification and recommend the most relevant Indian Standard(s), along with allied, cross-referenced, or normative standards that should also be considered.

### Description
Develop an AI-powered recommendation engine that integrates with procurement portals and assists procurement officials in identifying the most relevant Indian Standards and related standards while preparing tender specifications.

### Expected Features
- Accept product descriptions, technical specifications, or tender documents as input.
- Recommend the most relevant Indian Standard(s) based on semantic understanding rather than keyword matching.
- Identify allied standards, including normative references, test methods, terminology standards, safety standards, installation standards, and related product standards.
- Highlight the latest published version and amendments of the recommended standards.
- Suggest mandatory certification requirements, where applicable (e.g., BIS Product Certification, CRS, Hallmarking).
- Support multilingual input and natural language queries.

---

## Prototype Scope Decisions (2 days, 6 people + AI agents)

**In scope for demo:**
- Curated dataset of ~500–1000 IS standards (title, scope, category, certification type, latest version)
- Semantic search: query → embeddings → cosine similarity → ranked standards
- Allied/normative standards mapping for a curated demo subset (30–50 flagship product categories)
- Certification requirement tagging (BIS Product Certification / CRS / Hallmarking) for demo subset
- Simple web frontend: text/spec input → ranked results with explanations
- Multilingual input via translation API stub (not native multilingual NLP)

**Out of scope / faked for demo:**
- Full BIS catalog coverage (thousands of standards)
- Live amendment/revision tracking (hardcoded for demo subset)
- Real procurement portal integration (positioned as "API-ready" only)
- Automated allied-standard detection across the entire catalog (manually curated for demo set instead)

---

## Task Breakdown (6 people)

### Task 1 — Data Curation Lead
**Owner:** Person 1
**Goal:** Build a clean, structured dataset of IS standards.
**Deliverable:** `is_standards.csv` / `is_standards.json` with columns: `standard_number, title, scope_description, category, latest_version, year, certification_type (BIS/CRS/Hallmarking/None), status (active/withdrawn)`

**Agent prompt:**
```
I need to build a dataset of Indian Standards (IS) published by the Bureau of Indian Standards (BIS)
for a hackathon prototype. Help me:
1. Identify publicly accessible sources that list IS standard numbers, titles, and scope descriptions
   (e.g. BIS website catalog pages, Wikipedia lists of Indian Standards, e-Gazette notifications,
   MSME/industry portals that reference IS numbers, sector-specific standard lists).
2. Write a Python scraping/parsing script that extracts: standard_number, title, scope_description,
   category (e.g. Cement, Electrical, Textiles, Food, Chemicals), latest_version, year_published.
3. Structure the output as a clean CSV/JSON with ~500-1000 rows, deduplicated, with no missing
   standard_number or title fields.
4. Flag any rows where the scope_description is missing or too short (<10 words) for manual review.
Prioritize breadth across categories over depth in any one category — I need coverage across at
least 15-20 product categories (mechanical, electrical, chemical, textile, food, construction, etc.)
so the demo can show generalization.
```

---

### Task 2 — Allied/Normative Standards Mapping
**Owner:** Person 2
**Goal:** Manually + agent-assisted mapping of cross-referenced/normative standards for a demo subset.
**Deliverable:** `allied_standards_mapping.json` — for 30-50 flagship products, a mapping of primary standard → [allied standards with relationship type: normative reference / test method / terminology / safety / installation]

**Agent prompt:**
```
I have a base standard, e.g. IS 456:2000 (Plain and Reinforced Concrete - Code of Practice).
For a set of 30-50 flagship product categories (I will provide the list, e.g. cement, LPG cylinders,
electrical wiring, toys, drinking water, steel bars), help me identify commonly-referenced ALLIED
Indian Standards for each, categorized by relationship type:
- Normative reference standards (standards the primary standard explicitly points to)
- Test method standards (how the product is tested)
- Terminology standards (definitions used)
- Safety standards (applicable safety requirements)
- Installation/application standards (how the product is installed/used)
For each product category, output a JSON object like:
{
  "primary_standard": "IS XXXX:YYYY",
  "product": "...",
  "allied_standards": [
    {"standard": "IS YYYY:ZZZZ", "relationship": "test method", "note": "..."}
  ]
}
Use your general knowledge of Indian Standards structure and cross-referencing conventions. Flag any
mapping you are not confident about with a "confidence: low" note so we can manually verify before
the demo — do not present uncertain standard numbers as fact.
```

---

### Task 3 — Retrieval / ML Pipeline
**Owner:** Person 3 (+ Person 4 if needed)
**Goal:** Semantic search pipeline: query embedding → similarity search → ranked results → reranking.
**Deliverable:** `retrieval_pipeline.py` with a callable function `recommend_standards(query: str, top_k: int) -> List[dict]`

**Agent prompt:**
```
Build a semantic search pipeline in Python for recommending Indian Standards based on a free-text
product description or technical specification. Requirements:
1. Load a dataset of standards (columns: standard_number, title, scope_description, category,
   certification_type, latest_version) from CSV/JSON.
2. Embed each standard's title + scope_description using sentence-transformers
   (e.g. all-MiniLM-L6-v2) or an embeddings API.
3. Build a vector index (FAISS or Chroma) for fast similarity search.
4. Write a function recommend_standards(query: str, top_k: int = 5) that:
   - Embeds the input query
   - Retrieves top_k most similar standards by cosine similarity
   - Applies a lightweight rerank boost if the query text overlaps with the category field
   - Returns a list of dicts: {standard_number, title, similarity_score, category,
     certification_type, latest_version}
5. Include a fallback path that works even with a small placeholder dataset (~20 rows) so this
   pipeline can be developed and tested before the real dataset (Task 1) is ready.
6. Add a simple CLI test harness so I can run example queries and sanity-check the ranked output.
Keep dependencies minimal and installable via pip in a hackathon environment.
```

---

### Task 4 — Backend / API
**Owner:** Person 4 (or shared with Person 3)
**Goal:** Wrap the retrieval pipeline in a REST API, add certification lookup and multilingual stub.
**Deliverable:** FastAPI service with endpoints `/recommend`, `/allied/{standard_number}`, `/translate`

**Agent prompt:**
```
Build a FastAPI backend that wraps a standards-recommendation pipeline for a hackathon prototype.
Requirements:
1. POST /recommend — accepts {query: str, top_k: int = 5}, calls a recommend_standards() function
   (I will provide/import this from retrieval_pipeline.py), returns ranked results as JSON.
2. GET /allied/{standard_number} — looks up allied/normative standards for a given standard number
   from a local JSON mapping file (allied_standards_mapping.json), returns them grouped by
   relationship type. Return an empty list gracefully if no mapping exists for that standard.
3. POST /translate — accepts {text: str, target_lang: str}, calls a translation API
   (Google Translate API or similar) to translate non-English input to English before it's passed
   to /recommend, or translate output back to the requested language. Stub this cleanly if no API
   key is available yet — return the original text with a "translation_unavailable" flag.
4. Add CORS support so a React frontend on a different port can call this API locally.
5. Include a /health endpoint for quick sanity checks during integration testing.
6. Write clear error handling — if the pipeline or dataset isn't loaded yet, return a helpful
   error message rather than crashing.
```

---

### Task 5 — Frontend
**Owner:** Person 5
**Goal:** Simple, demo-ready UI: input box, ranked results, allied standards, certification badges, language toggle.
**Deliverable:** React app calling the backend API

**Agent prompt:**
```
Build a React frontend for an AI-powered Indian Standards recommendation tool, for a hackathon demo.
Requirements:
1. A text area where a procurement official can paste a product description or technical
   specification, plus a "Get Recommendations" button.
2. A language selector (English / Hindi / a couple of major Indian languages) that, when non-English,
   sends the query to a /translate endpoint before recommendation.
3. Results view: a ranked list of recommended standards, each showing standard_number, title,
   similarity/relevance score (as a simple bar or percentage), category, and a certification badge
   (BIS Product Certification / CRS / Hallmarking / None).
4. For each recommended standard, an expandable section showing "Allied & Normative Standards"
   fetched from /allied/{standard_number}, grouped by relationship type (test method, safety,
   terminology, installation, normative reference).
5. Clean, professional styling appropriate for a government/procurement audience — not flashy,
   trustworthy and clear. Use a card-based layout for results.
6. Handle loading and error states gracefully (e.g. "no strong matches found, try rephrasing").
Assume the backend is a FastAPI service running locally with endpoints /recommend, /allied/{id},
/translate — I will provide the base URL.
```

---

### Task 6 — Integration, Demo Prep, Pitch
**Owner:** Person 6 (+ everyone once their task is done)
**Goal:** Wire everything together, prepare compelling demo queries, build the pitch deck.
**Deliverable:** Working end-to-end demo + slide deck + rehearsed walkthrough

**Agent prompt:**
```
Help me prepare a hackathon demo and pitch deck for an AI-powered Indian Standards recommendation
engine (SIH problem statement, Ministry of Consumer Affairs / DoCA). The tool takes a product
description or tender specification and recommends applicable Indian Standards, allied/normative
standards, latest versions, and certification requirements (BIS/CRS/Hallmarking).
1. Help me pick 5-6 strong demo queries across different product categories (e.g. cement, LPG
   cylinders, electrical wiring, toys, drinking water) that will clearly show semantic understanding
   (not just keyword matching) and allied-standards discovery.
2. Draft a 8-10 slide pitch deck outline: problem, why it matters (procurement disputes, outdated
   standards, ambiguity), our solution architecture (embeddings + semantic search + allied mapping),
   demo walkthrough, impact/beneficiaries (procurement officials, PSEs, MSMEs), tech stack, and
   future scope (full BIS catalog integration, live procurement portal API, amendment tracking).
3. Suggest a tight 3-minute live demo script that flows naturally between the queries above.
4. Flag any claims in the deck that should be labeled as illustrative/estimated rather than
   presented as measured fact (e.g. accuracy numbers, coverage percentages) since we are working
   with a curated demo subset, not the full BIS catalog.
```

---

## Timeline

**Day 1**
- AM–PM (parallel): Data curation (Task 1, ongoing all day — longest pole), retrieval pipeline built against a small placeholder dataset (Task 3), backend skeleton (Task 4), frontend scaffolding (Task 5), allied-standards research begins (Task 2)
- Evening: Merge real dataset into pipeline; first end-to-end test

**Day 2**
- AM: Bug fixes, finalize allied-standards mapping, multilingual stub, UI polish
- PM: Integration testing, demo query curation, deck build, rehearsal, buffer time for last-minute issues

---

## Key Risks
- **Data availability:** BIS has no clean public API — scraping/curating standard metadata is the critical path. Throw the most people-hours here if it stalls.
- **Data accuracy:** Agents can hallucinate standard numbers/scopes — every standard number used in the live demo should be manually spot-checked before presenting.
- **Integration time:** Reserve real buffer time on Day 2 PM for the inevitable frontend↔backend wiring issues.
