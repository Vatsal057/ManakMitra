# Frontend Contract

These are backend guarantees the frontend must not silently break. None of
this is derivable from types alone -- every one of these was a real bug at
some point in this project's history, and a frontend rewrite has no reason
to know about any of it unless it's written down here.

`scripts/verify-frontend-contract.mjs` checks every item below that is
machine-checkable against a running app. Run it after any frontend change,
especially a rewrite by someone who hasn't seen this file.

---

## 1. `certification_type: "Not determined"` renders literally -- never `None`

**What it is**: `RecommendedStandard.certification_badge` is a tri-state
field: a real certification scheme name (e.g. `"BIS Product Certification"`),
or the literal string `"Not determined"` when the dataset doesn't know.
There is no code path that produces the string `"None"` -- if one appears,
something downstream synthesized it.

**Why it exists**: telling a procurement officer "no certification
required" about a standard whose certification status was never assessed is
the single most consequential error this product can make -- it's a false
negative that could let uncertified goods into a public tender. `"Not
determined"` and `"no certification required"` are different claims and
must never collapse into each other.

**How to verify**: render a result whose `certification_badge` is `"Not
determined"` (most of the demo-spine's non-cement rows are) and confirm the
UI shows that exact phrase. Grep the rendered DOM for a bare `"None"` string
in a certification badge -- it must not appear.

---

## 2. `confidence_band` is read, and high/moderate/low render distinctly

**What it is**: every `/recommend` response carries `confidence_band: "high"
| "moderate" | "low"`, replacing what used to be a binary `abstained` gate.

**Why it exists**: this failed last round. The backend emitted
`confidence_band` correctly for weeks; the frontend only ever branched on
the `abstained` boolean, so `"moderate"` rendered pixel-identical to
`"high"`. A procurement officer had no way to tell "this is a strong match"
from "this is a plausible but uncertain match" even though the backend knew
the difference.

**How to verify**: submit a query known to land in each band (see
`data/eval/RESULTS.md`'s band-distribution section for current examples,
e.g. `"red masonry blocks for load-bearing walls"` for moderate) and confirm
three visually distinct states, not two.

---

## 3. `abstained: true` shows the "no strong match in our corpus" state

**What it is**: `abstained` is `true` only when `confidence_band == "low"`.
It's kept in the response for backward compatibility with anything still
reading the old binary contract.

**Why it exists**: a `low`-band response still returns ranked near-misses
(so a procurement officer can eyeball them), but they must be visibly framed
as *not a confirmed recommendation* -- otherwise the UI silently upgrades a
guess into an answer.

**How to verify**: submit an out-of-corpus query (e.g. `"USB Type-C
charging cable"`) and confirm a distinct "no strong match" banner, not a
normal results list.

---

## 4. `similarity_score` is the displayed confidence; `fusion_rank_score` must never reach the DOM

**What it is**: `similarity_score` is dense cosine similarity -- bounded,
has a meaningful floor, and is what should be shown to a human as "how
confident is this match." `fusion_rank_score` is an RRF rank-fusion score:
unbounded-shaped, always near-maximal for a rank-1 result regardless of
match quality, and structurally incapable of expressing "no good match"
(see `data/eval/RESULTS.md`, Part A). It exists in the API response for
debugging only.

**Why it exists**: showing `fusion_rank_score` as if it were a confidence
value would make every top result look equally confident, defeating the
entire point of the confidence-band system in item 2.

**How to verify**: grep the rendered page's visible text (not the raw
network response, which is fine) for the literal string
`"fusion_rank_score"`. It must not appear anywhere a user can see it.

---

## 5. Allied standards group by relationship; `installation` must not be dropped

**What it is**: `/allied/{standard_number}` returns five fixed groups --
`test_method`, `safety`, `terminology`, `installation`, `normative_reference`
-- always present, possibly empty. The raw mapping data's
`installation_application` relationship value is remapped to the frontend's
`installation` key server-side.

**Why it exists**: this specific remap is the second most fragile point in
the pipeline after item 1 -- a naive 1:1 key copy from the raw JSON would
silently drop every installation-type entry, since the raw key name
(`installation_application`) doesn't match the frontend's declared type
(`installation`).

**How to verify**: expand allied standards on a result known to have
installation-type entries (e.g. IS 269, IS 8112 -- see
`data/eval/DEMO_CANDIDATES.md`'s tender-audit section) and confirm entries
actually appear under an "Installation" heading, not silently missing.

---

## 6. Demo-fallback banner is visible and unmissable when the backend is down

**What it is**: when the backend is unreachable and "Show demo data when
backend is unreachable" is enabled in Settings, the frontend serves local
mock data instead of erroring.

**Why it exists**: demo data that looks identical to live data is
indistinguishable from a live catalogue match -- at a judged demo, that's
functionally the same as showing fabricated results without disclosure.

**How to verify**: stop the backend, submit a query with the fallback
toggle on, and confirm an unmissable banner (not a subtle badge) stating the
results are demo/illustrative data, not a live match.

---

## 7. `22K+` and `431 labs` are framed against what is actually indexed (287 standards)

**What it is**: the landing page's headline figures (`22K+` standards,
`431` BIS-recognized labs) describe the *national* BIS catalogue and lab
network, not this system's indexed corpus, which is 287 standards
(`/health`'s `corpus_size`).

**Why it exists**: presenting `22K+` next to "Indexed by ManakMitra" without
qualification implies 22,000 standards are searchable here, which is false
and would be caught immediately by anyone testing a query outside the
287-row corpus. The honest framing (already present on the landing page as
of prompt 7 -- "287 / 22K+ Indexed by ManakMitra, of the full BIS
catalogue") must survive a rewrite.

**How to verify**: confirm the landing page shows the actual indexed count
(287, or whatever `/health.corpus_size` currently reports) explicitly
alongside, not instead of, the 22K+/431 headline figures.

---

## 8. `mandatory: false` and `certification_type: "None"` appear in no response or view

**What it is**: `mandatory` is `Optional[bool]` -- `null`/`None` when the
dataset doesn't know, never defaulted to `false`. There is no
`certification_type` value of the literal string `"None"` anywhere in the
dataset; a `None`/`null` Python value must serialize to JSON `null`, not the
string `"None"`.

**Why it exists**: same class of error as item 1 -- `mandatory: false` on an
unassessed standard asserts "we checked, it's not mandatory," which is a
different and false claim from "we don't know." A stringified Python
`None` (`str(None) == "None"`) is the literal bug this guards against; it
has happened before in this project (the certification join bug, documented
in `data/ENRICHMENT_REPORT.md`).

**How to verify**: grep raw `/recommend` and `/audit` JSON responses for
`"mandatory":false` (must not appear -- only `null` or `true`) and for the
substring `"None"` in any certification-related field.

---

## 9. Tender Audit never emits "outdated", "superseded", or "current"

**What it is**: the audit only reports edition *mismatches* (the spec cites
a year that doesn't match our record) and missing normative references. It
does not, and must not, characterize a standard's status as
outdated/superseded/current.

**Why it exists**: this system has no authoritative amendment/withdrawal
feed -- claiming a standard is "outdated" or "current" is a claim about BIS's
official status that this dataset cannot actually verify. An edition
mismatch is a fact ("the spec says 1978, our record says 2000"); "outdated"
is an inference this system is not entitled to make.

**How to verify**: grep audit responses and rendered audit views for the
literal words `"outdated"`, `"superseded"`, `"current"` (case-insensitive)
-- none should appear. Compare against `data/eval/sample_specs/01_cement_rcc.txt`,
which deliberately cites `IS 456 : 1978` against a corpus record of a later
edition, to confirm the mismatch is reported as a mismatch, not a status
claim.
