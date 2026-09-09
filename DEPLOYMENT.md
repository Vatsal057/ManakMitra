a# ManakMitra — Deployment Guide

Everything you need to run, deploy, and troubleshoot the public demo.

---

## The one thing to understand first

ManakMitra is **two separate things living in two different places**:

| Piece | Where it runs | Who pays / hosts | URL changes? |
|---|---|---|---|
| **Frontend** (React) | Vercel's servers, worldwide | Vercel, free | No — stable |
| **Backend** (FastAPI + ML) | **Your laptop**, exposed via Cloudflare Tunnel | You, free | **Yes — new URL every restart** |

The backend runs on your laptop because it needs ~3 GB of RAM when the
translation model loads. Every free managed host caps well below that
(Render's free tier is 512 MB — measured, the app uses 614 MB before
translation even starts). A tunnel gives your laptop a public `https://` URL,
so from a visitor's browser it looks like any normal cloud API.

**The consequence that causes 90% of problems:** the frontend has the backend
URL *baked into its JavaScript at build time*. So a new tunnel URL means you
must rebuild and redeploy the frontend. Editing a file is not enough.

```
Restart tunnel  →  new URL  →  MUST redeploy frontend
```

`scripts/start-demo.sh` does all of this for you. Use it.

---

## The three ways to run it

### Mode 1 — Full public demo (what you want for a presentation)

One command:

```bash
./scripts/start-demo.sh --deploy
```

This starts the backend, opens a tunnel, waits for DNS, smoke-tests all six
endpoints, redeploys the frontend against the new tunnel URL, and then
verifies the live site in a real browser. It refuses to finish quietly if any
step fails.

It ends by printing:

```
────────────────────────────────────────────────────────────
  Backend (public):  https://<random-words>.trycloudflare.com
  Frontend (public): https://manakmitra-phi.vercel.app
  Backend (local):   http://localhost:8000

  Leave this terminal OPEN. Ctrl+C stops the backend and tunnel.
────────────────────────────────────────────────────────────
```

**Leave that terminal open.** Closing it kills the backend, and the live site
goes dead. Takes about 2 minutes end to end.

### Mode 2 — Public backend, no redeploy

```bash
./scripts/start-demo.sh
```

Same as above but skips Vercel. Useful when you only want to test the API. It
prints the exact `vercel deploy` command to run if you change your mind.

Note the deployed site will still be pointing at the *previous* tunnel and so
will be broken until you redeploy.

### Mode 3 — Fully local (development)

Two terminals, no tunnel, no Vercel, nothing public:

```bash
# terminal 1
cd backend
../.venv/bin/python -m uvicorn src.api.main:app --reload --port 8000

# terminal 2
cd frontend/indian-standards-frontend
npm run dev          # → http://localhost:3000
```

The frontend defaults to `http://localhost:8000` in dev, so this just works.
`http://localhost:3000` is permanently allowed by the backend's CORS config.

Keep this as your **fallback**: if the tunnel dies mid-demo, you can present
from `localhost:3000` with zero setup.

---

## Current live URLs

- **Frontend:** https://manakmitra-phi.vercel.app *(stable, always this)*
- **Backend:** changes every run — read it off the script's output

---

## How the pieces connect

```
    Visitor's browser
           │
           │  loads the page
           ▼
    Vercel  (manakmitra-phi.vercel.app)
    static React files
           │
           │  fetch() to the URL baked in at build time
           ▼
    Cloudflare edge  (<random>.trycloudflare.com)
           │
           │  encrypted tunnel
           ▼
    cloudflared  ──►  uvicorn on localhost:8000
                      ├─ MiniLM embeddings   (~250 MB)
                      └─ NLLB translation    (+2.4 GB, loads on demand)
                         YOUR LAPTOP
```

Two settings control the wiring:

**`VITE_API_BASE_URL`** — tells the frontend where the backend is. Baked in at
build time, which is why a new tunnel needs a redeploy. Set automatically by
`start-demo.sh`; also written to `frontend/indian-standards-frontend/.env.production`
for local builds.

**`ALLOWED_ORIGINS`** — tells the backend which websites may call it (CORS).
You usually **don't need to set this**: `localhost:3000` and any
`*.vercel.app` address are already allowed. Only needed for a custom domain:

```bash
# backend/.env
ALLOWED_ORIGINS=https://manakmitra.example.com
```

---

## Verifying it works

Two scripts, and it's worth knowing the difference:

```bash
# Is the API reachable and correct? (6 endpoints, over the internet)
backend/scripts/smoke_test_deployment.sh https://<tunnel-url>

# Does the actual website work in a real browser?
node scripts/verify-deployment.mjs https://manakmitra-phi.vercel.app
```

The browser one catches things curl cannot: a wrong baked-in URL, a blocked
CORS preflight, a render crash. A passing curl test with a failing browser
test is exactly the situation that looks fine right up until you demo it.
`start-demo.sh --deploy` runs both automatically.

---

## Troubleshooting

### The site loads but searching does nothing / shows an error

Almost always: **the frontend is pointing at a dead tunnel.** Check which URL
the deployed site is actually calling:

```bash
JS=$(curl -s https://manakmitra-phi.vercel.app | grep -o '/assets/index-[^"]*\.js' | head -1)
curl -s "https://manakmitra-phi.vercel.app$JS" | grep -oE "[a-z-]+\.trycloudflare\.com" | sort -u
```

If that doesn't match your running tunnel, redeploy: `./scripts/start-demo.sh --deploy`

### `curl: (6) Could not resolve host` on a tunnel URL that should work

macOS-specific and confusing, because `dig` will resolve the name fine while
`curl` and your browser both fail. `dig` queries DNS directly; `curl` goes
through the system resolver (mDNSResponder), which negative-caches a
"doesn't exist" answer if anything looked the name up before Cloudflare
published it. The cache then keeps failing even though the tunnel is healthy.

```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

`start-demo.sh` avoids causing this (it waits on `dig` before ever running
`curl`) and will tell you explicitly if it detects a poisoned cache.

### Port 8000 already in use

```bash
lsof -ti:8000 | xargs kill
```

### CORS error in the browser console

The backend allows `localhost:3000` and `*.vercel.app` automatically. If
you're on a custom domain, set `ALLOWED_ORIGINS` in `backend/.env` and
restart the backend. Confirm with:

```bash
curl -sS -o /dev/null -D - -X OPTIONS https://<tunnel-url>/recommend \
  -H "Origin: https://your-site.com" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
```

### First non-English search is very slow

Expected. Translations for the demo queries are pre-cached in
`backend/data/cache/translations.json` (42 entries, all 7 languages) and are
instant. Anything *not* cached loads the NLLB model — about 2.4 GB and 30–60
seconds the first time, then fast. Prefer rehearsed queries live.

### Everything is broken and the demo is in five minutes

Fall back to Mode 3 (fully local). Two terminals, `localhost:3000`, no
network dependency at all.

---

## Demo-day checklist

1. Plug in the laptop. Disable sleep and screen lock.
2. `./scripts/start-demo.sh --deploy` — wait for `ALL PASSED`.
3. Open https://manakmitra-phi.vercel.app and run one real search.
4. Check it from your phone on **mobile data** (not your wifi) — proves it
   works from outside your network.
5. Leave the script's terminal open and untouched.
6. Keep a `localhost:3000` tab open as the fallback.

If there's a long gap before you present, re-run step 3 to confirm the tunnel
is still alive.

---

## Known limitations

**Quick tunnels have no uptime guarantee.** cloudflared says so itself on
startup. Fine for a demo; not for anything permanent. For a stable URL that
survives restarts, use a *named* tunnel (needs a free Cloudflare account and
a domain):

```bash
cloudflared tunnel login
cloudflared tunnel create manakmitra
cloudflared tunnel route dns manakmitra api.yourdomain.com
cloudflared tunnel run manakmitra
```

That URL never changes, which removes the redeploy-every-time problem
entirely.

**The laptop must stay on and connected.** It *is* the server.

**If you ever want a real always-on host,** `backend/Dockerfile` is ready and
works unchanged on any Docker platform. Realistically you need ~4 GB RAM, so
that means a paid tier or a free VM (Oracle Cloud's Always Free ARM instance
gives 24 GB). Nothing about the code changes — only `VITE_API_BASE_URL`.

---

## File reference

| File | Purpose |
|---|---|
| `scripts/start-demo.sh` | Start everything + deploy. Your main entry point. |
| `scripts/verify-deployment.mjs` | Browser end-to-end check of the deployed site. |
| `backend/scripts/smoke_test_deployment.sh` | API check against any base URL. |
| `frontend/.../.env.production` | Backend URL for production builds. Auto-written. |
| `backend/.env` | Optional. `ALLOWED_ORIGINS`, API keys. Not committed. |
| `backend/Dockerfile` | For a real container host, if you move off the tunnel. |
