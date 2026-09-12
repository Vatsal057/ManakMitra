// The API returns two numeric fields per result: similarity_score and
// fusion_rank_score. Verified against live queries before choosing:
// similarity_score is NOT usable as a "match %" — for an exact-identifier
// query it renders as ~2% (nonsensical for a perfect match), and under
// hybrid retrieval its per-result ordering doesn't even match the API's own
// result order. fusion_rank_score is the field the API actually ranks
// results by: monotonically decreasing, always in [0, 1], and correctly
// gives 1.0 to an exact-identifier match. That's what "Match" uses.
//
// If fusion_rank_score is ever absent from a result, this returns null —
// never a substituted number. Render null as an explicit "not available"
// state, not as a value (see the v1 frontend's normalizeScore() bug, which
// defaulted missing/unparseable scores to 85%/75% and must never be
// repeated).
export function getMatchPercent(result) {
  const score = result?.fusion_rank_score;
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  return Math.round(score * 100);
}

export const MATCH_THRESHOLD = 50;
