# Abstention Threshold Regression Log

Tracks the measured gap between genuine-query and no-answer dense-similarity
score distributions as the corpus grows, so a trend is visible over time
instead of re-derived from scratch each session. `ABSTENTION_THRESHOLD` and
`LOW_CONFIDENCE_BOUNDARY` (`src/retrieval/search.py`) are **not** changed by
this log or by adding entries to it — see the "do not re-tune" rule in
`BACKEND_STATUS.md` and the Part 4 fixes prompt. This file only records what
was measured, run over run.

| Date | Corpus size | Overlap width (genuine min − no-answer max) | False accepts (graded band) | False abstains (graded band) |
|---|---|---|---|---|
| 2026-09-08 | 287 rows | −0.2094 | 0/14 | 25/72 (~35%) |
| 2026-09-10 | 337 rows | −0.2337 | 1/14 | 21/72 (~29%) |
| 2026-09-10 | 337 rows (re-run, `evaluate.py` append-fix verification) | −0.2337 | 1/14 | 21/72 (~29%) |

(The 337-row row is measured twice on the same date: once during the Part 4
verification session, once again here as part of proving the `evaluate.py`
append fix — both runs are on the identical 337-row corpus/query set and
landed on identical numbers, which is itself a useful confirmation that the
measurement is stable and not an artifact of a particular run.)

## Reading the trend

Two points is a trend line, not proof. Both measured facts, stated plainly:

- The overlap widened (−0.2094 → −0.2337) as the corpus grew from 287 to 337
  rows -- the no-answer max moved up (0.4273 → 0.4516) while the genuine min
  stayed put (0.2179 in both runs).
- A false accept appeared at 337 rows ("solar photovoltaic module mounting
  structure for rooftop installation", 0.4516) that was not present at 287
  rows, at the graded-band level (it does not cause `abstained: false` --
  it lands in `moderate`, not `high` -- but it is the first crack in the "no
  no-answer query ever scores above the low boundary" safety property).
- False abstains improved slightly in absolute terms (25/72 → 21/72) between
  these two points, but that is not evidence the underlying separability
  problem is improving -- it reflects 3 additional queries landing in
  `moderate` under the graded-band scheme at 337 rows, not the genuine/
  no-answer distributions pulling apart.

**Is the direction concerning enough to flag for the pitch/deck?** Yes, as a
noted caveat, not as a blocker. The trend so far is one additional corpus
growth step producing one additional overlap unit and one new graded-band
false accept -- a real signal that a single global cosine threshold degrades
as more standards enter the corpus, but not (yet) a production-breaking
failure: `abstained` never flipped to `false` for a genuine no-answer query
at either measurement, and the false-accept only reaches the `moderate`
band, which is presented to users as lower-confidence, not as a clean hit.
If a third data point at a materially larger corpus size (e.g. 500+ rows)
shows the overlap continuing to widen in the same direction, that would be
strong enough evidence to justify replacing the single global threshold with
a better confidence signal (per-category threshold, learned classifier) --
proper evidence this two-point log does not yet provide on its own. For now:
log it, watch it, do not re-tune it against two points.
