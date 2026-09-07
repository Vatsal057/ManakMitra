# Task 4 — Backend API

FastAPI service wrapping the Task 3 retrieval pipeline and the Task 2 allied
standards mapping.

## Run

```bash
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn api.main:app --reload --port 8000
```

- Interactive docs: http://127.0.0.1:8000/docs
- Base URL for the frontend: `http://127.0.0.1:8000`

First startup takes a few seconds because the embedding model loads during
app startup (deliberately, so the first user request doesn't pay that cost).
Embeddings are cached in `ml/.cache`, so later starts are quick.

Run from the repository root, not from inside `api/`.

> **Not production-ready as-is.** All endpoints are unauthenticated with no rate
> limiting. That's fine on localhost for the demo, but anything public needs an
> API key or gateway in front of it, plus request limits.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Readiness, dataset stats, active backends |
| POST | `/recommend` | Free text → ranked Indian Standards |
| GET | `/allied/{standard_number}` | Allied / normative standards, grouped |
| POST | `/translate` | Translate text between English and Indian languages |
| GET | `/languages` | Language options for the selector |
| GET | `/demo-queries` | Curated demo queries, including Hindi examples |
| GET | `/standards/{standard_number}` | Single standard lookup, any number format |

### POST /recommend

```jsonc
// request
{
  "query": "Procurement of TMT reinforcement bars Fe 500D for RCC slab casting",
  "top_k": 5,
  "source_lang": "hi",        // optional; omit for English
  "include_allied": true      // optional; embeds allied standards in each result
}
```

```jsonc
// response (abridged)
{
  "query": "...",              // text actually used for retrieval (post-translation)
  "original_query": "...",     // text as submitted
  "count": 3,
  "strong_match": true,        // false => show the "no strong match" state
  "advice": null,              // hint string when strong_match is false
  "translation": { "applied": true, "provider": "offline-glossary", ... },
  "retrieval_mode": "semantic",
  "took_ms": 123,
  "results": [
    {
      "rank": 1,
      "standard_number": "IS 1786:2008",
      "canonical_key": "IS1786|",
      "title": "High Strength Deformed Steel Bars ...",
      "score": 0.399,                  // use for the relevance bar
      "similarity_score": 0.561,
      "category": "Steel",
      "certification_type": "BIS Product Certification",
      "certification_basis": "Steel and steel products QCO ...",
      "certification_confidence": "high",
      "latest_version": "2008",
      "amendments": 4,
      "status": "active",
      "scope_snippet": "...",
      "match_reasons": ["strong semantic match on scope", "..."],
      "needs_verification": false,
      "has_allied": true,
      "allied_count": 5,
      "flagship_product": "High Strength Deformed (TMT / HYSD) Steel Rebar",
      "allied": { }                    // only when include_allied was true
    }
  ]
}
```

Frontend notes:

- Render the certification badge from `certification_type`; treat `None` as no
  badge. When `certification_confidence` is `medium`, label it indicative.
- Show a caution marker when `needs_verification` is true.
- Only render the "Allied & Normative Standards" expander when `has_allied` is
  true, otherwise the call returns an empty result.
- `retrieval_mode: "lexical"` means the semantic model is missing on that
  machine and quality is lower. Worth a small banner.

### GET /allied/{standard_number}

URL-encode the number: `/allied/IS%201786%3A2008`. Any format works — `IS 1786`,
`IS 1786:2008` and `IS 383-2016` all resolve to the same standard, because
lookup goes through the pipeline's canonical number parser rather than string
equality.

Always returns 200. When nothing is mapped you get `mapped: false`, an empty
`groups` array and a `message`, so no special-casing is needed. Coverage is 45 of
the 54 flagship products, so gate the UI section on `has_allied` from
`/recommend` rather than assuming a mapping exists.

```jsonc
{
  "primary_standard": "IS 1786:2008",
  "matched_standard": "IS 1786",
  "product": "High Strength Deformed (TMT / HYSD) Steel Rebar",
  "mapped": true,
  "total": 5,
  "groups": [
    {
      "relationship": "test_method",
      "label": "Test methods",
      "count": 3,
      "standards": [
        { "standard_number": "IS 1599:2012", "title": "Metallic Materials — Bend Test",
          "relationship": "test_method", "note": "Mandatory ductility verification ...",
          "confidence": "high" }
      ]
    }
  ]
}
```

Groups arrive in reading order: normative references, test methods, terminology,
safety, installation and application, related products. Use `label` directly as
the section heading.

### POST /translate and multilingual queries

`/recommend` translates on its own when `source_lang` is a non-English code or
when the text contains an Indic script, so the frontend can simply post the
Hindi text. Use `/translate` directly only if you want to translate output back.

Provider order:

1. Google Cloud Translation v2 — set `GOOGLE_TRANSLATE_API_KEY`.
2. LibreTranslate — set `LIBRETRANSLATE_URL` (and optionally `LIBRETRANSLATE_API_KEY`).
3. Offline glossary — no configuration, works with no network.

The offline glossary is a hand-written procurement vocabulary (about 80 terms
across Hindi, Marathi, Bengali and Tamil), not machine translation. It's enough
for demo queries like *"कार्यालय भवन के लिए तांबे के केबल की आपूर्ति"* →
`office building copper cable supply`. Responses always say which provider ran,
via `provider` and `reason`, so the demo never implies more capability than
exists.

```bash
export GOOGLE_TRANSLATE_API_KEY=...   # optional, enables real translation
```

## Configuration

| Variable | Effect |
|---|---|
| `MANAKMITRA_DATASET` | Override the standards dataset path |
| `GOOGLE_TRANSLATE_API_KEY` | Enable Google translation |
| `LIBRETRANSLATE_URL` | Enable a self-hosted LibreTranslate |
| `LIBRETRANSLATE_API_KEY` | Key for the above, if required |

CORS is open to `localhost` and `127.0.0.1` on any port, covering Vite (5173),
CRA (3000) and preview servers.

## Errors

Every error returns the same envelope:

```json
{ "error": "pipeline_unavailable", "detail": "...", "hint": "..." }
```

| Status | When |
|---|---|
| 422 | Empty query, missing `query`, or `top_k` outside 1–50 |
| 404 | `/standards/{n}` for a standard not in the dataset |
| 503 | Retrieval pipeline failed to load — see `/health` for the reason |
| 500 | Unexpected error; the traceback is in the server logs |

`/health` returns 200 even when broken, with `status` of `ok`, `degraded` or
`error`, so a monitor can tell "reachable but unhealthy" from "unreachable".
`/allied`, `/translate` and `/languages` keep working even if the retrieval
pipeline is down, since they don't depend on it.
