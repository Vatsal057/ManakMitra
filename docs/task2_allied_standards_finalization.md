# Task 4: Allied Standards Mapping Finalization & Promotion Report

> **⚠ Historical record.** This report documents the batch 01/02 audit that
> produced the **15 primary standards / 53 mappings** revision. The mapping was
> later expanded to **45 primaries / 142 mappings**, which is what
> `data/allied_standards_mapping.json` now contains, so the counts and the
> "remaining 39 flagship products" note in section 6 are superseded. Everything
> promoted here survives in the current file, and the nine rejected pairings in
> section 3 remain purged — both are enforced by
> `tests/test_allied_mapping.py`. Section 6.2's four missing standards have since
> been ingested into `data/curated_standards_supplement.json`. The audit
> reasoning below is still the authoritative record of *why* those mappings were
> accepted or rejected.

> **Project:** AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications  
> **Sub-Module:** Task 2 — Allied & Normative Standards Mapping  
> **Milestone:** Task 4 — Final Promotion & Verified Dataset Delivery for Role 4 (Backend/API)  
> **Deliverable File:** `data/verified/allied_standards_mapping.json`  
> **Audit References:** `reports/allied_standards_batch_01_audit.md`, `reports/allied_standards_batch_02_audit.md`  
> **Date:** September 7, 2026  

---

## 1. Executive Summary & Deliverable Purpose

This report documents the final promotion and verification of the Task 2 Allied Standards Knowledge Base (`data/verified/allied_standards_mapping.json`). 

In strict accordance with the project directives:
- Only mappings that survived rigorous quality audits (Batch 01 and Batch 02) have been promoted.
- All rejected mappings (invalid associations, co-procurement artifacts, mismatched equipment) have been completely purged.
- Mappings requiring manual physical sheet verification (`MANUAL_VERIFY`) that were not explicitly designated as usable for the demo have been excluded.
- The output structure is fully consolidated, deduplicated, and formatted specifically for direct ingestion by **Role 4 (Backend/API)** to power the `GET /allied/{standard_number}` endpoint.

---

## 2. Key Finalization Metrics

```
========================================================================================
                        TASK 2 FINAL PROMOTION METRICS
========================================================================================
FINAL PRIMARY STANDARDS:                               15
FINAL ALLIED MAPPINGS:                                 53
----------------------------------------------------------------------------------------
CONFIDENCE BREAKDOWN:
  • HIGH CONFIDENCE:                                   51  (96.23%)  ██████████████████
  • MEDIUM CONFIDENCE:                                  2  ( 3.77%)  █
  • LOW CONFIDENCE:                                     0  ( 0.00%)
----------------------------------------------------------------------------------------
BATCH CONTRIBUTIONS:
  • Batch 01 (Civil & Structural):                     29  (54.72%)  (29 evaluated, 29 promoted)
  • Batch 02 (PPE, Electro, Fasteners, Chem, Textile):  24  (45.28%)  (34 evaluated, 24 promoted)
----------------------------------------------------------------------------------------
EXCLUSIONS & QUALITY CONTROL:
  • REJECTED MAPPINGS (Invalid pairings purged):        9
  • EXCLUDED MANUAL_VERIFY (Unverified test reagent):   1
  • TOTAL PURGED / EXCLUDED:                           10
----------------------------------------------------------------------------------------
RELATIONSHIP TYPE DISTRIBUTION:
  • test_method:                                       25  (47.17%)  █████████
  • installation_application:                          16  (30.19%)  ██████
  • normative_reference:                                6  (11.32%)  ██
  • safety:                                             6  (11.32%)  ██
  • terminology:                                        0  ( 0.00%)
========================================================================================
```

---

## 3. Batch Evaluation & Quality Filter Summary

| Audit Stream | Evaluated | Promoted | Reclassified | Downgraded | Excluded (Manual) | Rejected | Survival Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Batch 01 (Civil & Structural)** | 29 | **29** | 1 | 0 | 0 | 0 | 100.0% |
| **Batch 02 (Cross-Sector Flagships)** | 34 | **24** | 4 | 1 | 1 | 9 | 70.6% |
| **Total Cumulative** | **63** | **53** | **5** | **1** | **1** | **9** | **84.1%** |

### Summary of Controlled Exclusions:
1. **9 Rejected Mappings (Purged):**
   - `IS 2925` $\rightarrow$ `IS 4151` (Industrial helmet $\neq$ Motorcycle helmet; distinct statutory and hazard domains)
   - `IS 4151` $\rightarrow$ `IS 2925` (Symmetrical invalid pairing)
   - `IS 3156-3` $\rightarrow$ `IS 4201` (Erroneous CT application guide mapped to VT standard)
   - `IS 3156-3` $\rightarrow$ `IS 3188` (Turnkey substation package co-procurement; string insulators do not mount VTs)
   - `IS 368` $\rightarrow$ `IS 4160` (Domestic immersion heaters do not interface with industrial interlocking sockets)
   - `IS 302-2-3` $\rightarrow$ `IS 368` (Regulatory co-occurrence under Electrical QCO $\neq$ allied standard)
   - `IS 1364-3` $\rightarrow$ `IS 2636` (Precision heavy structural hex nuts $\neq$ finger-tightened wing nuts)
   - `IS 3063` $\rightarrow$ `IS 3075-2` (Bolted joint lock washers $\neq$ cylindrical bore snap rings/circlips)
   - `IS 3771 : 2019` $\rightarrow$ `IS 1242` (Heavy hospital bed sheeting $\neq$ lightweight apparel shirting)
2. **1 Manual Verification Exclusion (`MANUAL_VERIFY`):**
   - `IS 260` $\rightarrow$ `IS 1070:1992` (Reagent water purity specification for laboratory alum titration; unverified in physical amendment sheets and low direct procurement relevance for bulk coagulant tenders).

---

## 4. Complete Catalog of Verified Primary Standards & Promoted Allied Standards

The verified knowledge base contains **15 primary product standards** with **53 high-value, procurement-focused allied standards**:

### 4.1. Civil & Structural Engineering (Batch 01)

#### 1. `IS 1786` — High Strength Deformed (TMT / HYSD) Steel Rebar (5 Mappings)
* **`IS 1608`** (`test_method` | `high`): Mandatory tensile testing method (0.2% proof stress, UTS, elongation per Clause 8.1).
* **`IS 1599:2012`** (`test_method` | `high`): Mandatory bend and rebend ductility verification across specified mandrels (Clause 8.3).
* **`IS 228`** (`test_method` | `high`): Mandatory ladle and product chemical analysis for C, S, P, and Carbon Equivalent (Clause 4.2).
* **`IS 2502 - 1963`** (`installation_application` | `high`): Workmanship code for cutting, bending schedules, minimum internal bend radii, and fixing.
* **`IS 456`** (`installation_application` | `high`): National RCC design code defining design yield strength, modular ratio, and cover depth.

#### 2. `IS 269 - 2015` — Ordinary Portland Cement (33, 43, 53 Grade) (5 Mappings)
* **`IS 4031 - 1988`** (`test_method` | `high`): Prescribes standard physical tests (fineness, setting times, compressive strength).
* **`IS 4032 - 1985`** (`test_method` | `high`): Prescribes chemical analysis methods for loss on ignition, magnesia, and insoluble residue.
* **`IS 3535 - 1986`** (`test_method` | `high`): Standard sampling procedures and acceptance criteria for hydraulic cement lots.
* **`IS 650 - 1991`** (`normative_reference` | `high`): Standard Ennore sand specification mandatory for preparing mortar cubes for strength testing.
* **`IS: 4082`** (`installation_application` | `high`): Recommendations for site storage and stacking to prevent moisture absorption.

#### 3. `IS 456` — Plain and Reinforced Concrete (RCC Structures) (8 Mappings)
* **`IS 269 - 2015`** (`normative_reference` | `high`): Specification for ordinary Portland cement constituents.
* **`IS 383-2016`** (`normative_reference` | `high`): Specification for coarse and fine aggregate grading and deleterious limits.
* **`IS 1786`** (`normative_reference` | `high`): Specification for high strength deformed steel bars for concrete reinforcement.
* **`IS 516 - 1959`** (`test_method` | `high`): Standard test methods for compressive and flexural strength of concrete beam and cube specimens.
* **`IS 1199`** (`test_method` | `high`): Standard sampling procedures, slump tests, and analysis of freshly mixed concrete.
* **`IS: 9103`** (`normative_reference` | `high`): Specifications for chemical admixtures for concrete (plasticizers, retarders, accelerators).
* **`IS 10262`** (`installation_application` | `high`): Recommended national guidelines for concrete mix design proportioning.
* **`IS: 4990`** (`installation_application` | `high`): Specification for shuttering/plywood formwork used to cast in-situ RCC members.

#### 4. `IS 383-2016` — Coarse and Fine Aggregates for Concrete (6 Mappings)
* **`IS 2386 (Part I) 1963`** (`test_method` | `high`): Sieve analysis, particle size distribution, and flakiness/elongation index determination.
* **`IS 2386 (Part II) 1963`** (`test_method` | `high`): Estimation of deleterious materials, organic impurities, and clay lumps.
* **`IS 2386 (Part III) 1963`** (`test_method` | `high`): Determination of specific gravity, bulk density, water absorption, and bulking of sand.
* **`IS 2386 (Part IV) 1963`** (`test_method` | `high`): Determination of mechanical properties (aggregate crushing value, impact value, abrasion).
* **`IS 2386 (Part V) 1963`** (`test_method` | `high`): Soundness testing by sodium sulphate or magnesium sulphate cycles.
* **`IS: 2430`** (`test_method` | `high`): Methods of sampling mineral aggregates for acceptance testing.

#### 5. `IS 1077 - 1992` — Common Burnt Clay Building Bricks (5 Mappings)
* **`IS 3495 (Parts I TO iv) 1976`** (`test_method` | `high`): Testing methods for compressive strength, water absorption, and efflorescence.
* **`IS 5454 - 1978`** (`test_method` | `high`): Statistical sampling schemes and lot inspection criteria for burnt clay bricks.
* **`IS 2116 - 1980`** (`installation_application` | `high`): Specification for sand used in masonry mortars (reclassified from normative).
* **`IS 2250 - 1981`** (`installation_application` | `high`): Code of practice for preparation and use of masonry mortars on construction sites.
* **`IS 2212:1991`** (`installation_application` | `high`): National code of practice for brickwork construction and jointing.

---

### 4.2. PPE, Electrical, Mechanical, Chemical & Textile Standards (Batch 02)

#### 6. `IS 2925` — Industrial Safety Helmets (Head Protection PPE) (2 Mappings)
* **`IS 7692:1975`** (`test_method` | `high`): Standard wooden headform apparatus for shock absorption and penetration resistance testing.
* **`IS 4905:2015`** (`test_method` | `high`): Statistical random sampling procedures for lot acceptance and destructive type-testing.

#### 7. `IS 4151` — Protective Helmets for Two-Wheeler Riders (3 Mappings)
* **`IS 7692:1975`** (`test_method` | `high`): Headform apparatus specification for cranial deceleration and impact attenuation testing.
* **`IS 15575 (Part 1) : 2016`** (`test_method` | `high`): Sound level instrumentation for hearing attenuation / acoustic audition tests.
* **`IS 9973:1981`** (`safety` | `high`): Mandatory safety specification for visors fitted to vehicular helmets.

#### 8. `IS 2997` — Air Circulator Electric Fans and Regulators (3 Mappings)
* **`IS 302-1:2008`** (`safety` | `high`): Foundational statutory electrical safety baseline under the Electrical Appliances QCO.
* **`IS 732:1989`** (`installation_application` | `high`): National electrical wiring code governing fan mounting heights, earthing, and loading.
* **`IS 4160`** (`installation_application` | `medium`): Industrial interlocked switch-socket outlets for heavy-duty workshop circulators.

#### 9. `IS 3156-3` — Protective Voltage Transformers (PT / VT) (1 Mapping)
* **`IS 3156 (Part 1):1992`** (`normative_reference` | `high`): Explicit parent standard governing common insulation, temperature rise, and testing rules.

#### 10. `IS 368` — Electric Immersion Water Heaters (2 Mappings)
* **`IS 302-1:2008`** (`safety` | `high`): Base electrical safety standard for insulation resistance, leakage current, and shock prevention.
* **`IS 1293:2019`** (`safety` | `high`): Explicit mandatory 3-pin earthed plug interface (Clause 8.2).

#### 11. `IS 302-2-3` — Electric Irons (Household Electrical Appliances) (3 Mappings)
* **`IS 302-1:2008`** (`safety` | `high`): Explicit parent safety standard cited in Clause 1.
* **`IS 366:1991`** (`installation_application` | `high`): Performance and thermostat specification paired in BIS STI and tenders (reclassified from normative).
* **`IS 1293:2019`** (`safety` | `high`): Explicit mandatory earthed plug and cord interface (Clause 25.1).

#### 12. `IS 1364-3` — Hexagon Nuts (Product Grades A and B, M1.6 to M64) (3 Mappings)
* **`IS 1367 (Part 6):1994`** (`test_method` | `high`): Mechanical property verification, proof load testing, and hardness tests.
* **`IS 1364 (Part 1):2002`** (`installation_application` | `high`): Mating male fastener (hexagon bolts) reclassified per mating hardware rules.
* **`IS 3063`** (`installation_application` | `high`): Anti-loosening single coil spring lock washer companion standard.

#### 13. `IS 3063` — Single Coil Spring Lock Washers (Fasteners) (2 Mappings)
* **`IS 1586 (Part 1):2018`** (`test_method` | `high`): Rockwell hardness test method (44 to 51 HRC verification).
* **`IS 1364-3`** (`installation_application` | `high`): Mating hexagon nut standard engineered to receive split spring washers.

#### 14. `IS 260` — Non-Ferric Aluminium Sulphate (Water Treatment Alum) (2 Mappings)
* **`IS 10500:2012`** (`installation_application` | `high`): National drinking water standard defining residual aluminium limits ($0.03\text{ mg/l}$) and potable compliance.
* **`IS: 3025`** (`installation_application` | `medium`): Water testing methods (jar test coagulation dosing) governing plant application.

#### 15. `IS 3771 : 2019` — Bleached Cotton Khadi Long Cloth (3 Mappings)
* **`IS 1964:2001`** (`test_method` | `high`): Test method for determination of fabric mass per unit area (GSM).
* **`IS 1969 (Part 1):2009`** (`test_method` | `high`): Strip tensile testing method for fabric breaking force and elongation.
* **`IS 1390:1983`** (`test_method` | `high`): Test method for determining aqueous extract pH (safe skin-contact range 6.0 to 8.5).

---

## 5. Schema & API Contract for Role 4 (Backend)

The finalized JSON deliverable [`data/verified/allied_standards_mapping.json`](file:///c:/Users/sreev/SIH/SIH_Task2_Allied_Standards/data/verified/allied_standards_mapping.json) conforms exactly to the following contract:

```json
[
  {
    "primary_standard": "IS 1786",
    "product": "High Strength Deformed (TMT / HYSD) Steel Rebar",
    "allied_standards": [
      {
        "standard": "IS 1608",
        "title": "Method for Tensile testing of Steel products  – 1972",
        "relationship": "test_method",
        "note": "Mandatory tensile testing method prescribed in Clause 8.1 of IS 1786:2008 for determining 0.2% proof stress / yield strength, tensile strength (UTS), and percentage elongation of deformed rebar.",
        "confidence": "high"
      }
    ]
  }
]
```

### Direct Backend Integration:
Role 4 can index this JSON by `primary_standard` (and normalized variants, e.g. stripping spaces/years) to serve:
```http
GET /allied/{standard_number}
```
Returning the structured `allied_standards` array and metadata with sub-millisecond lookup latency.

---

## 6. Remaining Limitations & Future Expansion Roadmap

1. **Targeted Coverage Scope:** The current verified mapping covers 15 priority flagship products spanning Civil, PPE, Electrical, Mechanical Fasteners, Water Treatment Chemicals, and Handloom Textiles. The remaining 39 flagship products in `data/flagship_products.json` can be expanded in subsequent batches following the established methodology.
2. **Missing Authoritative Standards Cataloging:** As identified during the Batch 02 audit, several critical companion standards (e.g., `IS 4146:1983` for Voltage Transformers, `IS 2099:1986` for HV Bushings, `IS 2016:1967` for Plain Washers, and `IS 4218` for ISO Metric Threads) are authentic BIS standards that should be ingested into the central standards database in future updates.

---

## 7. Sign-Off & Verification Status

- [x] **JSON Validation:** Verified with `python -m json.tool` (Exit Code 0).
- [x] **Unit & Integrity Tests:** Passed automated verification suite `tests/test_verified_mapping.py`.
- [x] **Zero Hallucinations:** Every standard number, title, and relationship trace directly to audited BIS texts and CPWD engineering specifications.
- [x] **Zero Purged Mappings:** 100% of rejected mappings successfully excluded.
