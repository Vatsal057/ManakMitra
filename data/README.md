# Data

Provenance and shape of every data file, and how they combine at load time.

## Files

| File | Owner | Rows | What it is |
|---|---|---|---|
| `bis_standards_dataset.json` / `.csv` | Task 1 | 226 | Scraped standards metadata: number, title, scope, category, year, review flags |
| `needs_review.csv` | Task 1 | 135 | Subset flagged during scraping as needing manual review |
| `flagship_products.json` | Task 2 | 54 | Selected flagship products with their primary standard and selection rationale |
| `allied_standards_mapping.json` | Task 2 | 45 primaries, 142 mappings | Allied / normative / test-method / safety / installation standards per primary standard |
| `curated_standards_supplement.json` | Task 3 | 40 | Hand-curated standards filling the categories the scrape missed |
| `certification_map.json` | Task 3 | 48 entries | Certification scheme per base IS number (ISI / CRS / Hallmarking) |

Task 2's allied mapping has two accompanying reports in [`docs/`](../docs/):

- [`task2_allied_standards_expansion_batch_03.md`](../docs/task2_allied_standards_expansion_batch_03.md)
  — the current state: 45 primaries, 142 mappings, 45 of 54 flagship products,
  and why the remaining 9 were left unmapped rather than given artificial
  mappings.
- [`task2_allied_standards_finalization.md`](../docs/task2_allied_standards_finalization.md)
  — the earlier batch 01/02 audit: how mappings were promoted and which nine
  pairings were rejected, with reasons. Its counts are superseded; its reasoning
  is not.

`tests/test_allied_mapping.py` enforces both reports against the shipped file:
the current totals and distributions, the 15 originally audited primaries
surviving expansion, the nine rejected pairings staying purged, and the 45/54
coverage split.

## How they combine

`ml.retrieval_pipeline.load_standards()` builds the live index in four steps:

1. Read the **primary** dataset (`bis_standards_dataset.json` by default).
2. Merge the **supplement**, deduplicating by canonical standard number so a
   curated row and a scraped row for the same standard collapse into one entry,
   with the richer text winning.
3. Add any standard **cited by the allied mapping** but absent from the dataset,
   so it is searchable.
4. Apply the **certification overlay**, which never overwrites a certification
   value already present in the dataset.

226 + 40 + 64 allied-only → **322 standards** after merging, of which 55 carry a
certification scheme (47 ISI, 5 CRS, 3 Hallmarking).

Four of the curated rows (`IS 2016`, `IS 4218 Part 1`, `IS 4146`, `IS 2099`) were
added because section 6.2 of the Task 2 finalization report flagged them as
authentic BIS standards that the allied audit needed but the central dataset
lacked. Each was checked against its published BIS scan; see
`verified_reference` on those rows.

## Standard number formats

The scraped dataset writes numbers six different ways, and the Task 2 files use
different ones again:

```
IS 269 - 2015      IS: 9103        IS 4375 : 2019      IS 302 :
IS 2911-1-1        IS 432 (P II) 1966                  IS:2720 (Part.29) 1975
IS 1786            IS 383-2016     IS 1786:2008
```

All of these are parsed into `(base, part, year)` and compared by a canonical
key, so `IS 1786`, `IS 1786:2008` and `IS:1786` all resolve to the same standard.
**Never join these files by raw string equality** — 5 of the 45 allied mappings
would silently miss, and which 5 changes as the dataset gains better editions.
Use `ml.retrieval_pipeline._canonical_key` or the `canonical_key` field returned
by the API.

## Accuracy

Every row exposes `needs_verification`, and curated entries carry a
`source_confidence`:

- `high` — number, title and year checked against a bis.gov.in document during
  curation. Where a URL was recorded it is in `verified_reference` or
  `certification_reference`.
- `medium` — subject and number believed correct, exact edition year unconfirmed.
- `low` / unset — inherited from the scrape, usually because the scope is under
  12 words.

Known defects in the scraped data, left as-is rather than silently patched:

- `year_published` contains impossible values for a few rows (`2090`, `2062`)
  lifted out of titles. The loader drops implausible years instead of showing
  them.
- `latest_version` holds an amendment count (`"Amendments: 6"`) rather than a
  version, for 48 rows. The loader splits this into an `amendments` integer.
- Roughly 15% of rows sit in the wrong category — soil tests under
  "Water & Environment", a steel wire standard under "Electrical". Ranking
  compensates by scaling metadata boosts with semantic similarity.
- One title is corrupted: `IS: 432` reads `"; 226; 2062 – mild steel of grade I"`.

Certification tagging reflects Quality Control Orders and CRS notifications as
of curation. These change; treat `confidence: medium` entries as indicative and
never as compliance advice.
