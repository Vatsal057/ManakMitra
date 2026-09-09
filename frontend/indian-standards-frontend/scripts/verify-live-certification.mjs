// Verifies the tri-state certification contract and the abstention state
// end-to-end against a REAL running backend (not a mock). Run with:
//   npx tsx scripts/verify-live-certification.mjs
// (with `python -m uvicorn src.api.main:app --port 8000` running separately)
//
// No JS test runner exists in this project yet -- this matches that scale
// rather than introducing one. It exits non-zero on any assertion failure
// so it can be wired into a CI step later without modification.
import { fetchRecommendations, normalizeCertificationBadge } from '../src/services/api.ts';

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok:   ${message}`);
  }
}

async function main() {
  // 1. Tri-state certification contract, against a query known to return a
  // "Not determined" row (IS 456 has no hand-verified QCO citation).
  const cementResult = await fetchRecommendations('43 grade ordinary portland cement');
  assert(!cementResult.isDemoFallback, 'cement query hit the live backend, not the demo fallback');
  const notDetermined = cementResult.standards.find(s => s.certification_badge === 'Not determined');
  assert(!!notDetermined, 'a live result rendered certification_badge exactly "Not determined" (not "None")');
  assert(normalizeCertificationBadge('Not determined') === 'Not determined', 'normalizeCertificationBadge passes through "Not determined" unchanged');
  assert(normalizeCertificationBadge(null) !== 'None', 'normalizeCertificationBadge(null) is never "None"');

  // 2. Abstention state, against a genuinely adversarial query.
  const adversarial = await fetchRecommendations('fibre optic patch cords for structured cabling');
  assert(!adversarial.isDemoFallback, 'adversarial query hit the live backend, not the demo fallback');
  assert(adversarial.abstained === true, 'adversarial query sets abstained: true');
  assert(typeof adversarial.confidenceSignal === 'number' && adversarial.confidenceSignal < 0.5, 'confidenceSignal reflects low dense similarity');
  assert(adversarial.standards.length > 0, 'near-misses are still returned when abstained, never an empty list');

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll live-backend assertions passed.');
}

main().catch(err => {
  console.error('Verification script errored (is the backend running on :8000?):', err);
  process.exit(1);
});
