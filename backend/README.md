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

FastAPI retrieval + translation service for the ManakMitra frontend.
Deployed on Hugging Face Spaces (Docker SDK) -- see `Dockerfile`.

## Environment variables

Set these under Space Settings -> Variables and secrets:

- `ALLOWED_ORIGINS` (variable, not secret) -- comma-separated list of
  frontend origins allowed to call this API via CORS, e.g.
  `https://manakmitra.vercel.app`. `*.vercel.app` preview URLs are already
  allowed via regex; this is for your production custom domain / main
  Vercel URL.
- `GOOGLE_TRANSLATE_API_KEY` (secret, optional) -- only needed if you swap
  `TranslationService`'s provider to `GoogleTranslateProvider`. The default
  NLLB-200 provider needs no key.

## Endpoints

- `GET /health`
- `POST /recommend`
- `POST /translate`
- `GET /allied/{standard_number}`
- `POST /audit`
- Interactive docs at `/docs`

## Cold start

First request after a restart builds the retrieval index and downloads the
NLLB-200 (~2.4GB) and MiniLM (~90MB) model weights from the Hugging Face
Hub if they aren't already cached on the Space's persistent storage. This
can take several minutes on the first call.
