#!/usr/bin/env bash
# Smoke-test a deployed (or tunnelled) ManakMitra backend.
#
#   ./scripts/smoke_test_deployment.sh https://something.trycloudflare.com
#
# Exercises every endpoint the frontend actually calls, over the network, so a
# pass means "reachable from outside" and not merely "imports cleanly". Exits
# non-zero on the first failure so it can gate a demo checklist.
set -uo pipefail

BASE="${1:-}"
if [[ -z "$BASE" ]]; then
  echo "usage: $0 <base-url>" >&2
  exit 2
fi
BASE="${BASE%/}"  # strip trailing slash -- callers paste URLs inconsistently

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_FILE="$SCRIPT_DIR/../data/eval/sample_specs/01_cement_rcc.txt"

pass=0
fail=0

# check <label> <curl-args...> -- expects HTTP 200 and a non-empty body,
# then greps the body for a required substring passed via REQUIRE.
check() {
  local label="$1"; shift
  local require="${REQUIRE:-}"
  local body http
  body="$(curl -sS --max-time 120 -w $'\n%{http_code}' "$@" 2>&1)"
  http="$(printf '%s' "$body" | tail -n1)"
  body="$(printf '%s' "$body" | sed '$d')"

  if [[ "$http" != "200" ]]; then
    printf '  FAIL  %-34s HTTP %s\n' "$label" "$http"
    printf '        %s\n' "$(printf '%s' "$body" | head -c 300)"
    fail=$((fail + 1)); return
  fi
  if [[ -n "$require" ]] && ! printf '%s' "$body" | grep -q "$require"; then
    printf '  FAIL  %-34s 200 but missing %s\n' "$label" "$require"
    printf '        %s\n' "$(printf '%s' "$body" | head -c 300)"
    fail=$((fail + 1)); return
  fi
  printf '  ok    %-34s %s\n' "$label" "$(printf '%s' "$body" | head -c 90)"
  pass=$((pass + 1))
}

echo "Smoke-testing $BASE"
echo

REQUIRE='"status"' check "GET  /health" "$BASE/health"

REQUIRE='"results"' check "POST /recommend (english)" \
  -X POST "$BASE/recommend" -H 'Content-Type: application/json' \
  -d '{"query":"ordinary portland cement for general construction work","top_k":5}'

# Hindi query that is present in data/cache/translations.json, so this asserts
# the translation path works without paying the ~2.4GB NLLB cold load.
REQUIRE='"translated_text"' check "POST /translate (hindi, cached)" \
  -X POST "$BASE/translate" -H 'Content-Type: application/json' \
  -d '{"text":"सामान्य निर्माण कार्य के लिए साधारण पोर्टलैंड सीमेंट","source_lang":"hi"}'

REQUIRE='"results"' check "POST /recommend (hindi, cached)" \
  -X POST "$BASE/recommend" -H 'Content-Type: application/json' \
  -d '{"query":"सामान्य निर्माण कार्य के लिए साधारण पोर्टलैंड सीमेंट","top_k":5,"source_lang":"hi"}'

REQUIRE='"test_method"' check "GET  /allied/IS 269" "$BASE/allied/IS%20269"

if [[ -f "$SPEC_FILE" ]]; then
  # --arg + jq would be cleaner, but jq isn't guaranteed present; python3 is,
  # and it JSON-escapes the spec text safely rather than by hand.
  payload="$(python3 -c 'import json,sys; print(json.dumps({"spec_text": open(sys.argv[1], encoding="utf-8").read()}))' "$SPEC_FILE")"
  REQUIRE='"summary"' check "POST /audit (sample spec)" \
    -X POST "$BASE/audit" -H 'Content-Type: application/json' -d "$payload"
else
  printf '  SKIP  %-34s missing %s\n' "POST /audit" "$SPEC_FILE"
fi

echo
echo "passed: $pass   failed: $fail"
[[ "$fail" -eq 0 ]] || exit 1
