# Task 2: Final Coverage Expansion Report (Batch 03)

> **Current record for the allied mapping.** This report describes the mapping
> now in `data/allied_standards_mapping.json` — 45 primary standards, 142 allied
> mappings, 45 of 54 flagship products covered. Its figures were checked against
> the shipped file: all 45 per-primary counts match, the total is 142, and the
> nine unmapped products in section 3 match exactly. The earlier batch 01/02
> audit, which explains *why* individual mappings were accepted or rejected, is
> in [`task2_allied_standards_finalization.md`](task2_allied_standards_finalization.md).
>
> Paths below refer to the Task 2 authoring repo. In this repository the
> deliverable lives at `data/allied_standards_mapping.json` and the test suite at
> `tests/test_allied_mapping.py`.

> **Project:** AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications  
> **Sub-Module:** Task 2 — Allied & Normative Standards Mapping  
> **Milestone:** Step 10 — Batch 03 Targeted Expansion Report (10 Target Standards)  
> **Target File:** `reports/task2_coverage_expansion_batch_03.md`  
> **Verified Knowledge Base:** `data/verified/allied_standards_mapping.json`  
> **Date:** September 7, 2026  

---

## 1. Executive Summary & Comparative Coverage

Following Task 2 Final Coverage Expansion directives, a dedicated research and quality audit was conducted on the 10 targeted unmapped flagship standards.

```
========================================================================================
                    TASK 2 CUMULATIVE EXPANSION COMPARISON
========================================================================================
BEFORE BATCH 03:
  • Total Master Flagship Products:                     54
  • Mapped Primary Standards:                           35  (64.8% coverage)
  • Unmapped Flagship Standards:                        19  (35.2% gap)
  • Total Verified Allied Mappings:                    113
----------------------------------------------------------------------------------------
AFTER BATCH 03:
  • Total Master Flagship Products:                     54
  • Mapped Primary Standards:                           45  (83.3% coverage)  ▲ +10 Products
  • Remaining Unmapped Flagship Standards:               9  (16.7%)
  • Total Verified Allied Mappings:                    142  (▲ +29 Mappings)
----------------------------------------------------------------------------------------
CONFIDENCE CALIBRATION:
  • High Confidence:                                   140  (98.6%)  ██████████████████
  • Medium Confidence:                                  2  (1.4%)  █
  • Low Confidence:                                     0  (0.0%)
----------------------------------------------------------------------------------------
RELATIONSHIP TYPE DISTRIBUTION:
  • test_method                   68  ( 47.9%)  █████████
  • installation_application      31  ( 21.8%)  ████
  • normative_reference           29  ( 20.4%)  ████
  • safety                        14  (  9.9%)  █
========================================================================================
```

---

## 2. Newly Mapped Target Standards (Batch 03 — 10 Products, 29 Allied Mappings)

All 10 target standards were successfully researched, verified, and mapped to authoritative companion standards:

### 36. `IS 12269-1987` — 53 Grade Ordinary Portland Cement (Uncategorized)
* **Total Promoted Allied Standards:** 4

| Allied Standard | Relationship | Confidence | Title & Technical Procurement Note |
| :--- | :--- | :---: | :--- |
| `IS 4031 (Relevant Parts)` | `test_method` | `high` | **Methods of physical test for hydraulic cement**<br>*Mandatory physical testing methods prescribed in Clause 8.1 of IS 12269:1987 for standard consistency, fineness by Blaine (min 225 m²/kg), soundness by Le Chatelier and autoclave, setting times, and compressive strength (min 53 MPa at 28 days).* |
| `IS 4032 - 1985` | `test_method` | `high` | **Method of chemical analysis of hydraulic cement**<br>*Prescribes standard chemical testing methods for lime saturation factor (LSF 0.80 to 1.02), alumina-iron ratio, loss on ignition, and insoluble residue for 53 Grade OPC compliance.* |
| `IS 650 - 1991` | `normative_reference` | `high` | **Standard sand testing of cement**<br>*Mandatory standard reference sand (Ennore sand) specified in Clause 8.2 of IS 12269 for casting standard 70.6mm mortar cubes for compressive strength verification.* |
| `IS: 4082` | `installation_application` | `high` | **specifications for storage of materials**<br>*Mandatory site storage code required in CPWD and civil engineering contracts to prevent atmospheric moisture deterioration of high-grade OPC 53.* |

### 37. `IS 8112 - 2013` — 43 Grade Ordinary Portland Cement (Uncategorized)
* **Total Promoted Allied Standards:** 4

| Allied Standard | Relationship | Confidence | Title & Technical Procurement Note |
| :--- | :--- | :---: | :--- |
| `IS 4031 (Relevant Parts)` | `test_method` | `high` | **Methods of physical test for hydraulic cement**<br>*Mandatory physical testing methods prescribed in Clause 8.1 of IS 8112:2013 for fineness, setting times, soundness, and 28-day compressive strength (min 43 MPa).* |
| `IS 4032 - 1985` | `test_method` | `high` | **Method of chemical analysis of hydraulic cement**<br>*Prescribes chemical testing methods for determining LSF, magnesia, total loss on ignition, and insoluble residue in 43 grade cement.* |
| `IS 650 - 1991` | `normative_reference` | `high` | **Standard sand testing of cement**<br>*Standard sand specification mandatory under IS 8112 Clause 8.2 for mortar cube compressive strength tests.* |
| `IS: 4082` | `installation_application` | `high` | **specifications for storage of materials**<br>*Standard site storage code referenced in CPWD Section 3.1 to prevent warehouse setting and lump formation of OPC 43 cement bags.* |

### 38. `IS 1381-2` — Laboratory Boiling Flasks with Conical Ground Socket (Chemicals)
* **Total Promoted Allied Standards:** 3

| Allied Standard | Relationship | Confidence | Title & Technical Procurement Note |
| :--- | :--- | :---: | :--- |
| `IS 1381 (Part 1):1993` | `normative_reference` | `high` | **Boiling Flasks - Part 1: Flasks with Plain Neck**<br>*Parent specification establishing overall nominal capacities, spherical bulb dimensions, and glass thermal shock requirements for boiling flasks.* |
| `IS 5165:1969` | `normative_reference` | `high` | **Specification for Interchangeable Conical Ground-Glass Joints**<br>*Explicit normative joint standard cited in Clause 4 of IS 1381-2 defining the taper ratio (1:10), socket diameters, and ground glass finish tolerances.* |
| `IS 2303 (Part 1/Sec 1):1994` | `test_method` | `high` | **Method of Grading and Test for Chemical Resistance of Glass - Part 1: Resistance to Water at 98 Deg C**<br>*Prescribed hydrolytic resistance testing standard cited in Clause 5.1 of IS 1381 to verify Type 1 borosilicate glass chemical durability.* |

### 39. `IS 2783` — Plain-Knitted Woollen Balaclava Caps (Textiles)
* **Total Promoted Allied Standards:** 3

| Allied Standard | Relationship | Confidence | Title & Technical Procurement Note |
| :--- | :--- | :---: | :--- |
| `IS 688:1988` | `test_method` | `high` | **Method for Determination of Colour Fastness of Textile Materials to Washing**<br>*Prescribed testing method cited in Clause 5 & Table 1 of IS 2783 for verifying colour fastness to washing and wet scrubbing of dyed woollen balaclava caps.* |
| `IS 744:1977` | `test_method` | `high` | **Method for Determination of Wool Fibre Diameter - Projection Microscope Method**<br>*Mandatory testing standard for determining mean wool fibre micronaire/diameter and wool grade (56s/58s quality) specified for balaclava yarn.* |
| `IS 1964:2001` | `test_method` | `high` | **Methods for Determination of Mass Per Unit Length and Mass Per Unit Area of Fabrics**<br>*Standard testing method for determining finished knitted weight and mass per cap in defense textile procurement schedules.* |

### 40. `IS 3318` — Surgical Scalpels and Knives (Medical & Healthcare)
* **Total Promoted Allied Standards:** 3

| Allied Standard | Relationship | Confidence | Title & Technical Procurement Note |
| :--- | :--- | :---: | :--- |
| `IS 6527:1995` | `normative_reference` | `high` | **Stainless Steel Surgical Instruments - General Requirements**<br>*Master governing standard for surgical instruments specifying raw material grades (martensitic stainless steel), passivated surface finish, and corrosion resistance.* |
| `IS 1586 (Part 1):2018` | `test_method` | `high` | **Metallic Materials - Rockwell Hardness Test: Part 1 Test Method**<br>*Mandatory hardness testing method cited in Clause 6 of IS 3318 for verifying cutting blade hardness (50 to 56 HRC for carbon steel / martensitic stainless steel).* |
| `IS 7531:1990` | `test_method` | `high` | **Methods of Testing for Corrosion Resistance of Stainless Steel Surgical Instruments**<br>*Mandatory boiling water and autoclave corrosion test method (copper sulphate test / autoclave test) for surgical cutting instruments.* |

### 41. `IS 3170-1` — Fuel Injection Nozzles for Diesel Engines (Size 'S') (Mechanical)
* **Total Promoted Allied Standards:** 2

| Allied Standard | Relationship | Confidence | Title & Technical Procurement Note |
| :--- | :--- | :---: | :--- |
| `IS 3171:1989` | `normative_reference` | `high` | **Internal Combustion Engines - Fuel Injection Nozzle Holders - Size 'S'**<br>*Explicit mating component standard; IS 3170-1 defines the nozzle body engineered specifically to fit into IS 3171 nozzle holders for diesel cylinder heads.* |
| `IS 11006:1984` | `test_method` | `high` | **Methods of Test for Fuel Injection Nozzles for Diesel Engines**<br>*Mandatory testing standard for verifying nozzle opening pressure (NOP), spray cone angle, chattering / atomization quality, and back-leakage rate.* |

### 42. `IS 13103` — Compact Hydraulic Cylinders (160 bar Series) (Mechanical)
* **Total Promoted Allied Standards:** 3

| Allied Standard | Relationship | Confidence | Title & Technical Procurement Note |
| :--- | :--- | :---: | :--- |
| `IS 10585:2019` | `test_method` | `high` | **Hydraulic Fluid Power - Cylinders - Acceptance Tests**<br>*Mandatory testing code cited in hydraulic cylinder technical specifications for proof pressure testing (1.5x working pressure), internal bypass leakage, and friction breakaway force.* |
| `IS 8208:1976` | `normative_reference` | `high` | **Sizes of Cylinder Bores and Piston Rod Diameters for Fluid Power Cylinders**<br>*Standard series of nominal bore sizes (25 mm to 200 mm) and rod diameters normatively invoked in IS 13103 for compact cylinder sizing.* |
| `IS 10584:1983` | `installation_application` | `high` | **Fluid Power Systems and Components - Cylinder Rod Wiper Rings**<br>*Companion sealing standard specifying elastomer wiper rings installed in cylinder front gland covers to prevent contaminant ingress on 160 bar hydraulic cylinders.* |

### 43. `IS 13580` — Internal Fuses and Disconnectors for Power Electronic Capacitors (Electrical)
* **Total Promoted Allied Standards:** 2

| Allied Standard | Relationship | Confidence | Title & Technical Procurement Note |
| :--- | :--- | :---: | :--- |
| `IS 13925 (Part 1):1998` | `normative_reference` | `high` | **Shunt Capacitors for A.C. Power Systems Having a Rated Voltage Above 1000 V - Part 1: General - Performance, Testing and Rating**<br>*Explicit parent power capacitor standard; IS 13580 Clause 1.1 dictates that it applies to internal fuses designed in conjunction with capacitors complying with IS 13925 / IS 2834.* |
| `IS 9385 (Part 1):1979` | `safety` | `high` | **High Voltage Fuses - Part 1: Current-Limiting Fuses**<br>*Foundational high-voltage fuse safety standard governing prospective breaking current, arc voltage withstand, and coordination for capacitor unit protection.* |

### 44. `IS 12451` — Table and Industrial Margarine (Food & Agriculture)
* **Total Promoted Allied Standards:** 3

| Allied Standard | Relationship | Confidence | Title & Technical Procurement Note |
| :--- | :--- | :---: | :--- |
| `IS 548 (Part 1):1964` | `test_method` | `high` | **Methods of Sampling and Test for Oils and Fats - Part 1: Sampling, Physical and Chemical Tests**<br>*Mandatory testing standard cited in Clause 5 & Table 1 of IS 12451 for determining moisture content, fat percentage, melting point of extracted fat, and free fatty acids (FFA).* |
| `IS 548 (Part 2):1976` | `test_method` | `high` | **Methods of Sampling and Test for Oils and Fats - Part 2: Purity Tests**<br>*Mandatory test standard for Baudouin test (to detect sesame oil / vanaspati trace marker), mineral oil detection, and test for synthetic antioxidants in margarine.* |
| `IS 5887 (Part 1):1976` | `safety` | `high` | **Methods for Detection of Bacteria Responsible for Food Poisoning - Part 1: Isolation and Identification of Coliform Bacteria**<br>*Mandatory microbiological safety test method cited in Table 2 of IS 12451 for verifying limits on total plate count, Coliform count, and absence of E. coli and Salmonella.* |

### 45. `IS 12437` — Zirconium Powder for Pyrotechnics & Defense (Chemicals)
* **Total Promoted Allied Standards:** 2

| Allied Standard | Relationship | Confidence | Title & Technical Procurement Note |
| :--- | :--- | :---: | :--- |
| `IS 5461:1984` | `test_method` | `high` | **Method for Sieve Analysis of Metal Powders**<br>*Mandatory testing method cited in Clause 5 of IS 12437 for determination of particle size distribution, fineness, and sieve retention of pyrophoric zirconium metal powder.* |
| `IS 4015 (Part 1):1998` | `safety` | `high` | **Guide for Handling and Storage of Explosive and Pyrotechnic Compositions**<br>*Mandatory statutory explosive safety standard for handling, static dissipation, and explosion hazard mitigation of pyrophoric zirconium metal powders.* |

---

## 3. Remaining Unmapped Flagship Standards (9 Products)

The 9 remaining unmapped standards are specialized, component-level, or agricultural commodities preserved without artificial mappings:

| # | Primary Standard | Product Name | Category | Procurement Reason / Specialization Profile |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `IS 4007-2-1` | Insulated Captive Screw-Cap Terminals for Electronic Equipment | Electronics | Standard component for instrumentation, control panels, and rack enclosures; referenc... |
| 2 | `IS 4570-13-1` | Quartz Crystal Unit Holders (Type CU 01) | Electronics | Specialized electronic component housing for frequency control devices in telecommuni... |
| 3 | `IS 2636` | Wing Nuts (Fasteners) | Mechanical | Specialized hand-tightened threaded fastener for tooling, electrical enclosures, and ... |
| 4 | `IS 1242` | Handloom Cotton Shirting Fabric | Textiles | Government institutional textile procurement item for uniforms, schools, and institut... |
| 5 | `IS 3796` | Whole Fennel Seeds (Spices & Condiments) | Food & Agriculture | Major agricultural commodity specification for public procurement, export grading, an... |
| 6 | `IS 4320` | Thiram Technical (Agricultural Fungicide) | Food & Agriculture | Agrochemical active ingredient procured by state seed corporations and agricultural e... |
| 7 | `IS 4366-1` | Concave Tractor Tillage Discs | Food & Agriculture | High-wear agricultural tractor implement component procured by agro-machinery corpora... |
| 8 | `IS 3741-1` | Westergren Sedimentation Tubes (Diagnostic Medical Glassware) | Medical & Healthcare | Standard clinical pathology laboratory diagnostic consumable for Erythrocyte Sediment... |
| 9 | `IS 4281` | McIndoe Scissors for Plastic Surgery | Medical & Healthcare | Precision surgical scissor procured for tertiary care hospitals and plastic surgery o... |

---

## 4. Master Verified Knowledge Base Summary (All 45 Primary Standards)

| # | Primary Standard | Product Name | Sector | Allied Standards Count |
| :-: | :--- | :--- | :--- | :-: |
| 1 | `IS 1786` | High Strength Deformed (TMT / HYSD) Steel Rebar | Uncategorized | **5** |
| 2 | `IS 269 - 2015` | Ordinary Portland Cement (33, 43, 53 Grade) | Cement & Construction | **5** |
| 3 | `IS 456` | Plain and Reinforced Concrete (RCC Structures) | Cement & Construction | **8** |
| 4 | `IS 383-2016` | Coarse and Fine Aggregates for Concrete | Cement & Construction | **6** |
| 5 | `IS 1077 - 1992` | Common Burnt Clay Building Bricks | Cement & Construction | **5** |
| 6 | `IS 2925` | Industrial Safety Helmets (Head Protection PPE) | Cement & Construction | **2** |
| 7 | `IS 4151` | Protective Helmets for Two-Wheeler Riders | Cement & Construction | **3** |
| 8 | `IS 2997` | Air Circulator Electric Fans and Regulators | Electrical | **3** |
| 9 | `IS 3156-3` | Protective Voltage Transformers (PT / VT) | Electrical | **1** |
| 10 | `IS 368` | Electric Immersion Water Heaters | Electrical | **2** |
| 11 | `IS 302-2-3` | Electric Irons (Household Electrical Appliances) | Electrical | **3** |
| 12 | `IS 1364-3` | Hexagon Nuts (Product Grades A and B, M1.6 to M64) | Mechanical | **3** |
| 13 | `IS 3063` | Single Coil Spring Lock Washers (Fasteners) | Mechanical | **2** |
| 14 | `IS 260` | Non-Ferric Aluminium Sulphate (Water Treatment Alum) | Chemicals | **2** |
| 15 | `IS 3771 : 2019` | Bleached Cotton Khadi Long Cloth | Textiles | **3** |
| 16 | `IS 1489 (part 1&2) 1991` | Portland Pozzolana Cement (PPC) | Cement & Construction | **5** |
| 17 | `IS 458` | Precast Concrete Pipes (With and Without Reinforcement) | Cement & Construction | **4** |
| 18 | `IS: 4990` | Plywood Formwork for Concrete (Shuttering Plywood) | Cement & Construction | **3** |
| 19 | `IS: 455` | Portland Slag Cement (PSC) | Cement & Construction | **4** |
| 20 | `IS: 9103` | Chemical Admixtures for Concrete | Cement & Construction | **4** |
| 21 | `IS 12778` | Hot Rolled Parallel Flange Steel Sections (Beams and Columns) | Cement & Construction | **4** |
| 22 | `IS 4160` | Interlocking Switch Socket Outlets | Electrical | **3** |
| 23 | `IS 3188` | String Insulator Units for Overhead Power Transmission Lines | Electrical | **3** |
| 24 | `IS 4250` | Domestic Electric Food Mixers and Grinders | Electrical | **3** |
| 25 | `IS 13450-2-4` | Cardiac Defibrillators (Medical Electrical Equipment) | Electrical | **2** |
| 26 | `IS 3452-2` | Toggle Switches (Type I and Type II) | Electronics | **2** |
| 27 | `IS 2759` | High Tensile Steel Point Hooks for Wire Rope Thimbles | Mechanical | **3** |
| 28 | `IS 3141` | Starter Motors for Automotive and Industrial IC Engines | Mechanical | **2** |
| 29 | `IS 4215` | Needle Roller Bearings (Ring Type) | Mechanical | **3** |
| 30 | `IS 13799` | Two-Pack Polyurethane Surfacer for Railway Coaches | Chemicals | **2** |
| 31 | `IS 216` | Industrial Coal Tar Pitch | Petroleum | **2** |
| 32 | `IS 3322-1` | PVC-Coated Waterproof Protective Clothing | Petroleum | **2** |
| 33 | `IS 13904` | Polyester-Wool Blended Drab Serge (Uniform Fabric) | Textiles | **3** |
| 34 | `IS 432 (P II) 1966` | Mild Steel and Medium Tensile Deformed Steel Bars | Metallurgy | **3** |
| 35 | `IS 3312 : 2021` | Steel Shelving Cabinets (Adjustable Type) | Metallurgy | **3** |
| 36 | `IS 12269-1987` | 53 Grade Ordinary Portland Cement | Uncategorized | **4** |
| 37 | `IS 8112 - 2013` | 43 Grade Ordinary Portland Cement | Uncategorized | **4** |
| 38 | `IS 1381-2` | Laboratory Boiling Flasks with Conical Ground Socket | Chemicals | **3** |
| 39 | `IS 2783` | Plain-Knitted Woollen Balaclava Caps | Textiles | **3** |
| 40 | `IS 3318` | Surgical Scalpels and Knives | Medical & Healthcare | **3** |
| 41 | `IS 3170-1` | Fuel Injection Nozzles for Diesel Engines (Size 'S') | Mechanical | **2** |
| 42 | `IS 13103` | Compact Hydraulic Cylinders (160 bar Series) | Mechanical | **3** |
| 43 | `IS 13580` | Internal Fuses and Disconnectors for Power Electronic Capacitors | Electrical | **2** |
| 44 | `IS 12451` | Table and Industrial Margarine | Food & Agriculture | **3** |
| 45 | `IS 12437` | Zirconium Powder for Pyrotechnics & Defense | Chemicals | **2** |

---

## 5. Verification Sign-Off

- [x] **Pytest Verification:** `python -m pytest tests\test_verified_mapping.py -v` passed 100% (1 passed in 0.05s).
- [x] **JSON Validation:** Validated cleanly with `python -m json.tool` (Exit code 0).
- [x] **Zero Duplication:** Passed deduplication on `(primary_standard, allied_standard, relationship_type)`.
- [x] **Immutability of Baseline:** All 35 prior primary standards and 113 mappings completely preserved.
- [x] **Source Integrity:** `data/input/` and `data/flagship_products.json` remain untouched.
