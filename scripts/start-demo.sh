#!/usr/bin/env bash
# One command to bring the whole public stack up.
#
#   ./scripts/start-demo.sh              # start backend + tunnel, print URL
#   ./scripts/start-demo.sh --deploy     # ...and redeploy the Vercel frontend
#                                        #    against the new tunnel URL
#
# Why this exists: a Cloudflare quick tunnel gets a NEW random URL every
# restart, and the frontend bakes that URL in at build time. So "restart the
# tunnel" always implies "rebuild + redeploy the frontend". Doing that by hand
# means copy-pasting a URL into two places and remembering to redeploy -- the
# single most likely thing to go wrong before a demo. This automates it.
#
# Ctrl+C shuts down both the backend and the tunnel cleanly.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend/indian-standards-frontend"
PYTHON="$ROOT/.venv/bin/python"
PORT=8000

DEPLOY=0
[[ "${1:-}" == "--deploy" ]] && DEPLOY=1

TUNNEL_LOG="$(mktemp -t manakmitra-tunnel)"
BACKEND_LOG="$(mktemp -t manakmitra-backend)"
BACKEND_PID=""
TUNNEL_PID=""

cleanup() {
  echo
  echo "Shutting down..."
  [[ -n "$TUNNEL_PID" ]] && kill "$TUNNEL_PID" 2>/dev/null
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null
  # Belt and braces: if anything we started somehow escaped (see the `exec`
  # note below), make sure :8000 isn't left held by a stray uvicorn.
  sleep 1
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill -9 "$BACKEND_PID" 2>/dev/null
  fi
  wait 2>/dev/null
  echo "Stopped. (Logs kept at $BACKEND_LOG and $TUNNEL_LOG)"
}
trap cleanup EXIT INT TERM

die() { echo "ERROR: $*" >&2; exit 1; }

[[ -x "$PYTHON" ]] || die "no venv python at $PYTHON"
command -v cloudflared >/dev/null || die "cloudflared not installed (brew install cloudflared)"

# --- 1. backend -----------------------------------------------------------
echo "[1/4] Starting backend on :$PORT ..."
if curl -sS --max-time 3 "http://localhost:$PORT/health" >/dev/null 2>&1; then
  echo "      something is already serving :$PORT -- reusing it"
else
  # `exec` matters: without it, $! is the subshell's PID and killing it leaves
  # uvicorn orphaned still holding :8000. exec replaces the subshell with
  # python, so $! is the real server process and cleanup actually works.
  ( cd "$BACKEND" && exec "$PYTHON" -m uvicorn src.api.main:app \
      --host 0.0.0.0 --port "$PORT" >"$BACKEND_LOG" 2>&1 ) &
  BACKEND_PID=$!
  for _ in $(seq 1 60); do
    curl -sS --max-time 3 "http://localhost:$PORT/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -sS --max-time 5 "http://localhost:$PORT/health" >/dev/null 2>&1 \
    || { echo "--- backend log ---"; tail -30 "$BACKEND_LOG"; die "backend never became healthy"; }
fi
echo "      backend healthy"

# --- 2. tunnel ------------------------------------------------------------
echo "[2/4] Opening Cloudflare tunnel ..."
cloudflared tunnel --url "http://localhost:$PORT" >"$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

TUNNEL_URL=""
for _ in $(seq 1 60); do
  # cloudflared prints the URL inside a box in its log; grab the first
  # trycloudflare.com host it mentions.
  TUNNEL_URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)"
  [[ -n "$TUNNEL_URL" ]] && break
  sleep 1
done
[[ -n "$TUNNEL_URL" ]] || { echo "--- tunnel log ---"; tail -30 "$TUNNEL_LOG"; die "no tunnel URL appeared"; }
echo "      $TUNNEL_URL"

TUNNEL_HOST="${TUNNEL_URL#https://}"

# IMPORTANT (macOS): wait for DNS using dig, which queries a resolver
# directly, BEFORE any curl. curl goes through the system resolver
# (mDNSResponder); if it looks the name up while the record still doesn't
# exist, macOS negative-caches the NXDOMAIN and then keeps failing with
# "Could not resolve host" long after the tunnel is fine. Ordering the checks
# this way means we never poison that cache. Measured: the tunnel was healthy
# and routing while curl kept failing instantly at 0s.
echo "      waiting for DNS to publish ..."
TUNNEL_IP=""
for _ in $(seq 1 90); do
  TUNNEL_IP="$(dig +short @1.1.1.1 "$TUNNEL_HOST" 2>/dev/null | grep -E '^[0-9.]+$' | head -1)"
  [[ -n "$TUNNEL_IP" ]] && break
  sleep 2
done
[[ -n "$TUNNEL_IP" ]] || die "tunnel hostname never appeared in DNS"
echo "      DNS ok ($TUNNEL_IP)"

# Readiness check pinned to the resolved IP, so a already-poisoned local cache
# (e.g. from an earlier run) can't produce a false failure here.
echo "      waiting for edge to route ..."
EDGE_OK=0
for _ in $(seq 1 45); do
  if curl -sS --max-time 10 --resolve "$TUNNEL_HOST:443:$TUNNEL_IP" \
       -o /dev/null "$TUNNEL_URL/health" 2>/dev/null; then EDGE_OK=1; break; fi
  sleep 2
done
[[ "$EDGE_OK" == "1" ]] || die "tunnel URL never became reachable from outside"
echo "      reachable"

# Now confirm the ordinary system resolver works too, since the smoke test,
# your browser, and everything else use it rather than --resolve.
if ! curl -sS --max-time 10 -o /dev/null "$TUNNEL_URL/health" 2>/dev/null; then
  cat >&2 <<EOF

WARNING: the tunnel is up and reachable, but this Mac's DNS cache has a stale
negative entry for $TUNNEL_HOST, so curl and your
browser will report "could not resolve host". Flush it with:

  sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

then re-run this script. (Vercel and remote visitors are unaffected -- this is
purely a local resolver cache issue.)
EOF
  die "local DNS cache is poisoned for this hostname"
fi
echo "      system DNS ok"

# --- 3. smoke test --------------------------------------------------------
echo "[3/4] Smoke-testing the public backend ..."
if ! "$BACKEND/scripts/smoke_test_deployment.sh" "$TUNNEL_URL"; then
  die "smoke test failed -- do not demo this"
fi

# Record it so `npm run build` locally picks up the right backend.
printf 'VITE_API_BASE_URL=%s\n' "$TUNNEL_URL" > "$FRONTEND/.env.production"

# --- 4. frontend ----------------------------------------------------------
FRONTEND_URL=""
if [[ "$DEPLOY" == "1" ]]; then
  echo "[4/4] Redeploying frontend to Vercel ..."
  command -v vercel >/dev/null || die "vercel CLI not installed (npm i -g vercel)"
  [[ -f "$FRONTEND/.vercel/project.json" ]] \
    || die "frontend not linked to a Vercel project (run: cd $FRONTEND && vercel link)"

  DEPLOY_LOG="$(mktemp -t manakmitra-vercel)"
  ( cd "$FRONTEND" && vercel deploy --prod --yes \
      -b "VITE_API_BASE_URL=$TUNNEL_URL" 2>&1 ) | tee "$DEPLOY_LOG"

  # Verify the URL we actually just deployed, not a hardcoded guess. Prefer the
  # stable production alias over the per-deployment URL. Getting this wrong once
  # meant browser-testing a stale project that still pointed at a dead tunnel.
  FRONTEND_URL="$(grep -oE 'https://[a-z0-9.-]+\.vercel\.app' "$DEPLOY_LOG" \
    | grep -vE '\-[a-z0-9]{8,}-' | tail -1)"
  [[ -n "$FRONTEND_URL" ]] || FRONTEND_URL="$(grep -oE 'https://[a-z0-9.-]+\.vercel\.app' "$DEPLOY_LOG" | tail -1)"
  [[ -n "$FRONTEND_URL" ]] || die "could not determine deployed frontend URL"
  rm -f "$DEPLOY_LOG"

  echo
  echo "Verifying $FRONTEND_URL in a real browser ..."
  node "$ROOT/scripts/verify-deployment.mjs" "$FRONTEND_URL" \
    || die "browser verification failed -- do not demo this"
else
  echo "[4/4] Skipping Vercel deploy (pass --deploy to include it)."
  echo "      Frontend must be rebuilt against the new URL or it will call a dead tunnel:"
  echo "        cd frontend/indian-standards-frontend"
  echo "        vercel deploy --prod --yes -b VITE_API_BASE_URL=$TUNNEL_URL"
fi

cat <<EOF

────────────────────────────────────────────────────────────
  Backend (public):  $TUNNEL_URL
  Frontend (public): ${FRONTEND_URL:-<not deployed this run>}
  Backend (local):   http://localhost:$PORT

  Leave this terminal OPEN. Ctrl+C stops the backend and tunnel.
────────────────────────────────────────────────────────────
EOF

wait
