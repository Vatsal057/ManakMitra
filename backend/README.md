---
title: ManakMitra Backend
emoji: 📐
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# ManakMitra backend

FastAPI retrieval, translation, and tender-audit service for
[ManakMitra](https://manakmitra-phi.vercel.app) — BIS standards
recommendation for public procurement.

Runs as a Docker Space; see `Dockerfile`. Listens on port 7860.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Status, corpus size, index build time |
| POST | `/recommend` | Standards for a specification query |
| POST | `/translate` | Indic → English query translation |
| GET | `/allied/{standard_number}` | Related standards, grouped |
| POST | `/audit` | Clause-by-clause tender spec audit |
| GET | `/i18n/languages` | Supported Indic languages and native autonyms |
| GET | `/i18n/{lang}` | Localized UI translation dictionary |
| GET | `/docs` | Interactive OpenAPI docs |

## Environment variables

Set under **Settings → Variables and secrets**:

- `ALLOWED_ORIGINS` *(variable, optional)* — comma-separated extra CORS
  origins. `http://localhost:3000` and any `*.vercel.app` origin are already
  allowed, so this is only needed for a custom domain.
- `GOOGLE_TRANSLATE_API_KEY` *(secret, optional)* — only if you swap
  `TranslationService` to `GoogleTranslateProvider`. The default NLLB-200
  provider is local and needs no key.

## Startup and first-request behaviour

The retrieval index builds at startup from `data/bis_standards_clean.csv`
(337 standards). Corpus embeddings ship pre-computed in
`data/cache/embeddings.npy`, so startup is fast.

Translation is lazy. `data/cache/translations.json` holds 42 pre-cached
queries across 7 Indic languages; those return instantly. Any *uncached*
non-English query downloads NLLB-200-distilled-600M (~2.4 GB) on first use,
which takes a while, then is fast. Peak memory is roughly 3 GB.

## Notes

- `similarity_score` is dense cosine similarity — the honest confidence
  figure. `fusion_rank_score` is an RRF ordering value and must never be
  shown as confidence.
- `mandatory` and `is_mandatory` are tri-state; `null` means not assessed,
  which is not the same as `false`.
- The audit reports "document cites X, our record shows Y" and never claims a
  standard is outdated or superseded.

## History

This Space previously hosted *Insightr*. That code is preserved on the
`insightr-original` branch.
