# ManakMitra Backend — Status Report (Part 4 verification)

Generated: 2026-09-10. Every number below was measured by actually running the code
(pandas against the live CSV/JSON, `pytest`, `scripts/evaluate.py`, a live `uvicorn`
process hit with real HTTP requests, `scripts/sync_translations.py`) during this
session — nothing here is asserted without having been executed first. Where a
number contradicts what Parts 1-3 reported, it is reported as measured, not
silently reconciled (per the prompt's own hard rule).

---

## 4.1 Data integrity

**Corpus** (`data/bis_standards_clean.csv`): **337 rows** (up from the 317-row baseline;
Part 2 added 20). Columns: `standard_number, standard_number_raw, is_number, part, title,
scope_description, scope_source, scope_usable, category, latest_version, version_source,
year_published, certification_type, mandatory, certification_source, qco_reference,
certification_basis, certification_reference, source_url, confidence, review_severity,
amendment_count, source, review_reason`.

- `scope_usable`: **274 True / 63 False**
- `review_severity`: **259 minor / 65 blocker / 13 none**
- `Uncategorized`: **2 rows** — `IS 26002` (assurance-engagement guidance) and
  `IS 4905:2015` (random sampling procedures). Both genuinely don't fit the existing
  category taxonomy; not a defect.
- `certification_type` breakdown: **282 "Not determined" / 48 BIS Product Certification /
  4 CRS / 3 Hallmarking** = **55 certifications determined**, unchanged from the
  317-row baseline — none of Part 2's 20 new rows got a certification determination.
- `certification_source`: **282 not_assessed / 45 public_knowledge / 10 qco_gazette**
- Literal string `"None"` in `certification_type`: **0 rows** (confirmed).
- `mandatory == False`: **0 rows** (confirmed). `mandatory` is `NaN` for 282 rows
  (not determined) and `True` for 55 (the rows with a determined certification) — the
  field is never synthesized to a `False` that wasn't measured.

**Allied mapping** (`data/allied_standards_mapping_normalized.json`):

- **102 primaries / 270 references**, all 372 entries resolve against the corpus's
  `is_number` (0 unresolved primaries, 0 unresolved references). Verified by joining
  every `primary_is_number` and every reference's `is_number` against
  `bis_standards_clean.csv`'s `is_number` column directly (not by inspection).
- Corpus rows touched (primary **or** reference) whose `is_number` appears in the
  corpus: **206 rows** — matches the session summary's claimed 206/317 exactly.
  **Important caveat, checked directly and worth stating plainly**: this coverage was
  measured against the 317-row corpus that existed when Part 1 ran. **0 of Part 2's
  20 new rows (the LED/fire-safety/water-pipe additions) have any allied mapping** —
  confirmed by intersecting the 20 `part2_gap_fill`-sourced rows against the touched
  set. So true coverage against the *current* 337-row corpus is 206/337 (61%), not
  206/317. This is exactly the gap the prompt told me to check for honestly.
  **Superseded by the Part 4 fixes pass (same day, see §4.4 below)**: 13 of the 20
  gap-fill rows now have allied mappings, moving coverage to 219/337 (65%). The
  102/206 numbers above and the per-category table immediately below describe the
  state *before* that pass and are left as-is for historical accuracy, not updated
  here to avoid rewriting a measured record after the fact.
- Per-category breakdown (rows touched / rows in category, %):

  | Category | Touched | Total | % |
  |---|---|---|---|
  | Medical & Healthcare | 8 | 8 | 100% |
  | Mining & Minerals | 4 | 4 | 100% |
  | Electrical Cables | 4 | 4 | 100% |
  | Toys | 4 | 4 | 100% |
  | Precious Metals | 3 | 3 | 100% |
  | Fasteners | 2 | 2 | 100% |
  | Food and Water | 2 | 2 | 100% |
  | Batteries, Consumer Electronics, Construction, IT Equipment, Electrical Instrument Transformers, Electrical Insulators, Electrical Appliances, Test Methods (Water/Cables/Metals) | 1 | 1 | 100% |
  | Metallurgy | 11 | 12 | 92% |
  | Gas Cylinders | 3 | 4 | 75% |
  | Cement & Construction | 61 | 87 | 70% |
  | Water & Environment | 8 | 12 | 67% |
  | Electronics | 6 | 9 | 67% |
  | Electrical | 22 | 35 | 63% |
  | Safety & PPE | 6 | 11 | 55% |
  | Textiles | 9 | 17 | 53% |
  | Chemicals | 11 | 21 | 52% |
  | Uncategorized, Plastics & Rubber | 1 | 2 | 50% |
  | Food & Agriculture | 5 | 13 | 38% |
  | Petroleum | 6 | 16 | 38% |
  | Mechanical | 18 | 55 | 33% |
  | Electrical Installation | 1 | 3 | 33% |
  | **Kitchenware** | **0** | **1** | **0%** |

  All of the spec's originally-zero-coverage categories now have ≥1 mapped standard
  **except Kitchenware**, which still has zero allied coverage (only 1 Kitchenware
  row exists in the corpus at all).

**Before/after vs. the stated pre-session baseline (317 rows, 47 mapped, 55 certified):**

| Metric | Baseline | Now | Delta |
|---|---|---|---|
| Corpus rows | 317 | 337 | +20 |
| Allied primaries | 47 (session prompt says 45 in one place, 47 in another — see note) | 102 | +55 to +57 |
| Certifications determined | 55 | 55 | +0 |
| Rows touched by allied mapping | — | 206 | (206/317 against Part 1's corpus; 206/337 = 61% against current corpus) |

Note on the baseline itself: the prompt text is internally inconsistent — the
"Verified current state" line says "45 primaries / 142 references," while the
"Part 1" summary two paragraphs later says "only 47 of 317 standards have allied
mappings." Measured file state (`allied_standards_mapping_normalized.json`) now
shows 102 primaries / 270 references either way, so this doesn't change the
after-number, just the reported delta size (+55 vs +57 primaries).

---

## 4.2 Retrieval quality

`data/eval/queries.jsonl` (50 queries) and `data/eval/queries_paraphrase.jsonl` (40
queries) both exist and were **not modified**. `scripts/evaluate.py` runs both sets
in a single invocation — it doesn't take corpus-scope flags; "both corpus scopes" in
the spec maps to the script's own two built-in scopes (full corpus vs. restricted to
`scope_usable==True` gold answers), which it always reports side by side. Ran once:
`python scripts/evaluate.py`, against the current 337-row corpus.

**Results were appended to `data/eval/RESULTS.md` as a new dated section
("Dated section: 2026-09-10 — Part 4 verification run") — the prior section (run
against a 287-row corpus snapshot) was left completely untouched, per the frozen/
append-only rule.** The script itself calls `RESULTS_PATH.write_text(...)`, which
*overwrites* the file — this is a real tension with the "never overwrite prior
sections" hard rule that I resolved manually (captured the file before running,
re-inserted it above the freshly-generated section afterward) rather than silently
running the script as-is and losing history. Flagging this as a latent bug in
`evaluate.py`'s own output path for whoever touches it next.

**Headline numbers (337-row corpus, full run):**

| Config | Frozen recall@1 | Frozen recall@5 | Paraphrase recall@1 | Paraphrase recall@5 |
|---|---|---|---|---|
| BM25 only | 0.800 | 0.911 | 0.097 | 0.194 |
| Dense only | 0.733 | 0.933 | 0.452 | 0.645 |
| Hybrid (RRF) | 0.778 | 0.933 | 0.226 | 0.387 |
| Hybrid + exact-identifier | 0.867 | 1.000 | 0.226 | 0.387 |
| **Conditional (adaptive)** | **0.867** | **1.000** | **0.452** | **0.645** |

**Adaptive routing still recovers paraphrase performance**: Conditional matches
Hybrid + exact-identifier on the frozen set (0.867/1.000) while matching Dense-only's
much stronger paraphrase numbers (0.452/0.645 vs. Hybrid's 0.226/0.387) — confirmed
by the script's own automated "Conditional fusion verdict" check, which passed on
all four set×scope combinations (frozen-full, frozen-restricted, paraphrase-full,
paraphrase-restricted).

**Did corpus growth (317→337) move recall?** Frozen-set numbers are essentially flat:
recall@1 0.800/0.733/0.778/0.867/0.867 vs. the last full historical run — matching to
2-3 decimal places (small MRR-only differences, e.g. Hybrid MRR 0.848→0.843, are
within the same ballpark and plausibly rank-order noise from added candidates, not
a real change; recall@k values themselves are identical). This matches the expected
pattern from the prior corpus-merge section already in `RESULTS.md`: the 20 new rows
(LED luminaires, fire safety, pipes) don't compete with this query set's cement/steel/
PPE targets, so they don't move recall for these particular queries.

**Abstention threshold re-check (`RetrievalIndex.compute_confidence`,
`ABSTENTION_THRESHOLD = 0.461`, status `provisional`, `LOW_CONFIDENCE_BOUNDARY = 0.4273`):**

- No-answer max dense similarity: **0.4516** (up from **0.4273** in the last recorded
  287-row-corpus run in `RESULTS.md`'s earlier section).
- Genuine-query min dense similarity: **0.2179** (unchanged).
- Overlap (genuine min − no-answer max, negative = overlap): **−0.2337**, widened
  from **−0.2094** at 287 rows. **The overlap widened, not narrowed**, with corpus
  growth — stated plainly because the alternative (assuming it stayed the same) would
  be exactly the kind of unverified claim this report exists to prevent.
- Binary-threshold false-abstain rate: **24/72 (33%)** of genuine queries (excluding
  exact-identifier queries), **0/14 (0%)** false accepts.
- Graded-band false-abstain rate (the one actually gating `abstained` in production):
  **21/72 (29%)**, with 3 queries rescued into `moderate`.
- **New regression found at the larger corpus, not present at 287 rows**: one
  no-answer query ("solar photovoltaic module mounting structure for rooftop
  installation," 0.4516) now scores *above* `LOW_CONFIDENCE_BOUNDARY` (0.4273) and
  lands in the `moderate` band instead of `low` — a **1/14 false accept** under the
  graded-band scheme, where the 287-row run had 0/14. This is a real, measured
  regression from corpus growth, not present in the last recorded run. It does not
  currently cause an "abstained: false" outcome (moderate still surfaces as low
  confidence, not a clean hit), but it is the first crack in the "no-answer never
  scores above the low boundary" safety property this threshold was built to hold.

---

## 4.3 Live endpoint checks

Started the API directly: `python -m uvicorn api.main:app --host 127.0.0.1 --port 8123`
from `backend/src` (no README/Makefile/run script exists in the repo — this is the
FastAPI app's own entry point, confirmed from `src/api/main.py`'s `app = FastAPI(...)`).
Startup completed in under 6 seconds — `TranslationService()` does **not** eagerly
load NLLB (`nllb_provider.py`'s `_load()` is called lazily, only from `.translate()`),
so startup cost is just building the retrieval index, not loading a ~2.4GB seq2seq
model. **NLLB was fully exercised in this section** (it is not too slow/heavy for
this environment) — first call took a few seconds to lazy-load the model, subsequent
calls were fast.

- **`GET /health`**: `{"status":"ok","model_loaded":true,"corpus_size":337,"index_build_seconds":0.0219}`

- **`POST /recommend` — "ordinary portland cement for construction"**: top result
  `IS 269:2015` (score 0.652), then `IS 8112:2013`, `IS 12269:1987`, `IS 1489-1-2:1991`,
  `IS 455` — all genuinely cement standards. `retrieval_mode: "hybrid"`,
  `confidence_band: "high"`.

- **`POST /recommend` — "IS 456"**: rank 1 is `IS 456` itself,
  `"match_type":"exact_identifier"`, `"retrieval_mode":"exact_identifier"` — confirmed.

- **`POST /recommend` — out-of-scope ("quantum computing chip fabrication process")**:
  `confidence_band: "low"`, `abstained: true`, `confidence_signal: 0.187` — a real low
  score, correctly abstains.

- **`POST /recommend` — "outdoor LED street lighting luminaires"** (the query that
  previously abstained at dense 0.321 per the prompt): **now returns real results and
  does not abstain** — `confidence_band: "high"`, signal 0.463. Top 5: `IS 1944-6:1981`
  (public-thoroughfare lighting), `IS 16102-2:2017` (self-ballasted LED lamps, Part 2),
  `IS 10322-4:1984` (luminaires, methods of test), `IS 16102-1:2012` (LED lamps, Part 1
  safety), `IS 10322-1:2014` (luminaires Part 1). **Part 2's corpus additions directly
  fixed this gap** — the top 5 results are exactly the standards Part 2 added.

- **`POST /recommend` — `source_lang: "hi"`, query "सीमेंट के लिए मानक"** ("standard for
  cement"): `translated_query: "Standard for cement"`, `translation_provider:
  "nllb-200-distilled-600M"`, top results `IS 269:2015`, `IS 456`, `IS 12269:1987` — all
  correct. **Important process note**: my first attempt at this check, sending the
  Hindi text through `curl -d` on this Windows/Git-Bash environment, silently mangled
  the UTF-8 payload and NLLB decoded the corrupted bytes into unrelated fluent English
  ("What is this?" / "What is the meaning of this verse?"), which briefly looked like
  an NLLB quality bug. Writing the JSON body to a UTF-8 file first and sending it with
  `curl --data-binary @file` fixed it completely — confirmed by calling
  `NLLBProvider.translate()` directly in Python (bypassing the shell entirely), which
  produced correct translations ("Standard for cement", "I have to buy cement",
  "Cement standard", "The standard of cement") on the first try. **This was a local
  shell-encoding artifact in my own test harness, not a backend defect** — flagging it
  explicitly rather than either hiding the bad first result or leaving a wrong
  "NLLB is broken" claim in this report.

- **`POST /recommend` — bare "IS 456" with `source_lang: "mr"` and `source_lang: "kn"`**:
  both return `translation_provider: "identifier-detection"` and
  `match_type: "exact_identifier"` — **confirmed the exact-identifier path bypasses
  NLLB entirely** for both languages; no model call is made.

- **`GET /allied/IS 1786`** (one of Part 1's newly-mapped standards): returns grouped
  allied standards by relationship type — `test_method: [IS 1608, IS 1599:2012,
  IS 228]`, `installation: [IS 2502:1963, ...]`, each with its `note` explaining the
  clause basis. Working as designed. (Unrelated pre-existing data-quality note: some
  titles carry mojibake, e.g. `"Method for Tensile testing of Steel products  â
  €“ 1972"` — a UTF-8-decoded-as-Latin-1 em-dash baked into the source CSV
  before this session; not something Part 1/4 introduced, listed here since it's
  visible in the raw API output.)

- **`POST /audit`** on `data/eval/sample_specs/01_cement_rcc.txt` (5 clauses: IS 269
  cement, IS 1786 TMT rebar, IS 456:1978 RCC design, curing, formwork): summary
  `{"clauses_total":5,"clauses_cited":3,"clauses_uncited":2,
  "missing_normative_refs_total":15,"edition_mismatches_total":1}`. **Missing
  normative references genuinely surface**: e.g. the IS 269 clause flags missing
  `IS 4031:1988` (test method), the IS 1786 clause flags missing `IS 1608` (tensile
  testing) and others, the IS 456:1978 clause flags missing `IS 516:1959` (compressive
  strength testing) plus an edition mismatch (spec cites 1978, current corpus has
  IS 456:2000). Uncited clauses (curing, formwork) get `suggested_standards` from
  retrieval instead (e.g. `IS 9103` for curing/admixtures, `IS 4990` for formwork).

- **`GET /i18n/languages`**: returns all 8 languages with native names — `bn, en, gu,
  hi, kn, mr, ta, te` with `বাংলা, English, ગુજરાતી, हिन्दी, ಕನ್ನಡ, मराठी, தமிழ், తెలుగు`.

- **`GET /i18n/hi`**: returns a flat 149-key map. Confirmed `certification.Not
  determined` resolves to a real (non-empty) Hindi string. `GET /i18n/xx` (unknown
  code): **404** with `"Unknown language code 'xx'. Valid codes: bn, en, gu, hi, kn,
  mr, ta, te"` — confirmed.

---

## 4.4 Known limitations — stated plainly

- **Certification coverage: 55/337 (16%)** have a determined certification type; the
  remaining 282/337 (84%) are `"Not determined"` (honest "we didn't check," never
  fabricated as a pass/fail). Unchanged by this session's corpus growth — none of
  Part 2's 20 new rows got a certification determination.

- **Allied coverage: 219/337 (65%)**, updated by the Part 4 fixes pass (was 206/337 /
  61% when this document was first generated). 13 of Part 2's 20 gap-fill rows now
  have genuine allied mappings, added via 6 new primaries in
  `data/allied_standards_mapping_normalized.json`: the IS 10322 luminaire family
  (Parts 1-4) cross-linked to each other, to IS 16102-1 (LED lamp safety) and to
  IS 1944-6 / IS 3646-1 (lighting installation codes); IS 16102-1 to IS 16102-2
  (companion performance-requirements part); IS 2190 (extinguisher code of practice)
  to IS 15683 (extinguisher spec); IS 9798 (LPG regulators) to IS 8737/IS 4576/
  IS 3196-1 (LPG cylinder/fitting/gas specs); IS 4926 (ready-mixed concrete code) to
  IS 456/IS 269/IS 383/IS 10262/IS 1199 (the standard concrete-material chain); and
  IS 12592 (precast concrete manhole cover) to IS 456/IS 383 (medium confidence —
  standard BIS practice for precast concrete products, not a stated clause). The
  remaining **7 of the 20 were skipped, each for a genuine "no defensible mapping in
  the current corpus" reason** (same bar as the original Kitchenware skip): IS 908
  (fire hydrant spec — no hydrant-specific installation/test-method standard in
  corpus; extinguisher standards are a different equipment class), IS 2189 (fire
  detection/alarm — no detection-specific companion standard in corpus), IS 12701 /
  IS 4985 / IS 4984 (water tank and potable-water pipe specs — no tank- or
  pipe-specific test-method or code-of-practice standard in corpus), IS 1726
  (cast-iron manhole covers — no casting/foundry or sewerage code-of-practice
  standard in corpus), and IS 14286 (solar PV modules — the only PV-specific
  standard in the 337-row corpus, no companion mounting/installation/test-method
  standard to link to). Kitchenware remains the one category from the original
  zero-coverage list that's still at 0% (only 1 corpus row exists in it).

- **Abstention threshold is still `provisional`** (`ABSTENTION_THRESHOLD = 0.461`,
  `LOW_CONFIDENCE_BOUNDARY = 0.4273`), and the measured overlap between genuine-query
  and no-answer score distributions **widened** with corpus growth: −0.2094 at 287
  rows → **−0.2337** at 337 rows. A new false accept (1/14, "solar photovoltaic module
  mounting structure for rooftop installation" at 0.4516) appeared at the graded-band
  level that wasn't present before. False-abstain rate on genuine paraphrase-style
  queries is 21/72-24/72 (29-33%) depending on whether the binary threshold or the
  graded band is used. This is not a tuned, validated threshold — it is a
  measured-and-kept placeholder. **Update (Part 4 fixes pass, same day): this is now
  logged as a two-point trend, not a single measurement** — see
  `data/eval/THRESHOLD_LOG.md`, which records both data points and re-confirms the
  337-row numbers on a second independent run (via the fixed, append-only
  `evaluate.py`). The threshold itself was **not** retuned in that pass, per explicit
  instruction — two data points is a trend, not proof, and this close to a demo is
  the wrong time to chase a self-referential fit to the eval set. Reading the
  direction plainly: it is concerning enough to flag as a caveat for the pitch/deck
  (the gate's safety margin is visibly shrinking as the corpus grows), but **not**
  concerning enough to block the demo on — `abstained` has not flipped to `false` for
  a genuine no-answer query at either measurement point, and the one false accept
  lands in `moderate` (shown as lower-confidence), not `high` (shown as a clean hit).
  A third measurement at a meaningfully larger corpus size showing the same widening
  direction would be the trigger to prioritize a real fix (per-category threshold or
  a learned confidence signal) over the current single global cosine cutoff.

- **NLLB quality on non-identifier text**: on the small sample checked directly (5
  short Hindi/Marathi/Kannada phrases, bypassing the shell to avoid the encoding
  artifact described in 4.3), translations were fluent and semantically correct
  ("standard for cement," "I have to buy cement," "cement standard," "the standard of
  cement"). This is not a rigorous BLEU-style evaluation — no held-out translation
  test set exists in this repo, so quality here is a spot-check, not a measured
  metric. `distilled-600M` is Meta's smallest NLLB checkpoint; expect it to degrade
  on longer or more idiomatic non-identifier text than what was tested here.

- **`sync_translations.py --apply`: run for real in the Part 4 fixes pass** (this
  entry originally described a dry-run only — updated in place now that the real run
  has happened, rather than left stale). NLLB load was confirmed with a warm-up call
  before the real run. Result: 282 machine translations written across `ta/te/bn/mr/
  gu/kn` (47 each), `stale_human_needs_review = 0` and `protected_missing = 0` across
  all 7 non-English languages. **All 8 languages (`en` + 7) now report 0 missing keys
  out of 149** — verified directly by diffing each language file's key set against
  `en.json`, not by trusting the script's own summary. Verified separately: 0
  `"source": "human"` entries were overwritten anywhere (byte-for-byte compared
  against a pre-run backup) and 0 protected (`certification.*`, `confidenceBand.*`,
  abstention) keys were machine-filled in any language. Spot-checked 4 machine-filled
  strings per newly-filled language for garbled/wrong-script/empty output: none found
  empty or wrong-script, but **one genuine translation-quality issue surfaced**: the
  `allDisciplines` key ("All Disciplines," an engineering-fields filter label) was
  mistranslated by NLLB in Tamil ("அனைத்து திடீர் முறைகளும்" ≈ "all sudden methods")
  and Telugu ("అన్ని శిక్షలు" ≈ "all punishments") — NLLB appears to have resolved the
  English word "discipline" to its punishment sense rather than its field-of-study
  sense in those two languages specifically (Bengali/Marathi/Gujarati/Kannada got it
  right). This is a real, semantically-wrong machine translation, not a safety-critical
  key, and not something this pass silently corrected (fixing translation content by
  hand would itself be an undocumented, unsourced edit) — flagged here for human
  review of that one key in `ta.json`/`te.json`.

---

## 4.5 Verdict

**Is the backend demo-ready?** Yes, for a guided demo along the paths this session
verified: cement/cable-style descriptive queries, exact-identifier lookup, the LED
query that was the original live-testing failure, Hindi/Marathi/Kannada input, the
audit endpoint on a prepared sample spec, and the i18n endpoints. All of those work
and were confirmed live, not assumed. It is **not** unconditionally demo-ready —
straying into a query about one of the **7 remaining** unmapped standards from Part
2's 20 new rows (down from 20, after the Part 4 fixes pass mapped 13 of them) will
still produce a correct retrieval hit but an empty allied panel, and straying into a
genuinely ambiguous or borderline query has a measured ~30% chance of a false
abstain.

**Update (Part 4 fixes pass, same day)**: both items originally listed here as
"what I'd fix first" are now done — `sync_translations.py --apply` closed the 282-key
gap across `ta/te/bn/mr/gu/kn` (0 missing keys in any of the 8 languages now), and
13 of Part 2's 20 gap-fill rows now have genuine allied mappings (219/337 overall,
up from 206/337). The abstention-threshold overlap remains the harder, more honest
problem — it needs a better confidence signal than a single global cosine cutoff, not
a quick fix, and is correctly left as `provisional` rather than papered over; it is
now tracked as a two-point trend in `data/eval/THRESHOLD_LOG.md` instead of a single
measurement, per the explicit instruction not to retune it on two data points.

---

## Definition-of-done items checked in this pass

- **Full test suite**: `pytest` from `backend/` → **89 passed, 0 failed** (18.5s).
- **`sync_translations.py` runs cleanly** and respects human translations: confirmed
  via dry-run above (0 stale-human overwrites attempted, 0 protected keys touched).
  **Update (Part 4 fixes pass, same day)**: `--apply` was subsequently run for real
  (NLLB warm-up confirmed first) — 282 real fills across `ta/te/bn/mr/gu/kn`, 0
  stale-human overwrites, 0 protected keys machine-filled, all 8 languages now at
  0 missing keys. See the updated §4.4 entry above for the one translation-quality
  issue found on spot-check (`allDisciplines` in `ta`/`te`).
