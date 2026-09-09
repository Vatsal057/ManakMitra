import { RecommendedStandard, AlliedStandardsGrouped, Language } from '../types/standards';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', scriptBadge: 'EN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', scriptBadge: 'हि' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', scriptBadge: 'த' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', scriptBadge: 'తె' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', scriptBadge: 'বা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', scriptBadge: 'म' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', scriptBadge: 'ગુ' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', scriptBadge: 'ಕ' },
];

export const PROCUREMENT_SAMPLE_PROMPTS = [
  {
    title: 'LT Copper Power Cable (1100V)',
    category: 'Electrical',
    query: 'Procurement of 3-core copper conductor flexible PVC insulated and sheathed power cable, 1100V grade for indoor institutional electrification and distribution panel wiring conforming to national building standards.',
  },
  {
    title: 'Ordinary Portland Cement (Grade 43/53)',
    category: 'Civil & Construction',
    query: 'Supply of Grade 43/53 Ordinary Portland Cement (OPC) and Portland Pozzolana Cement for structural foundation, RCC beam casting, and high-strength culvert construction with rapid hardening property.',
  },
  {
    title: 'Industrial Safety Helmets & Head Protection',
    category: 'Safety & PPE',
    query: 'Purchase of industrial safety helmets made of high-density polyethylene (HDPE) with shock absorption test compliance, adjustable chin straps, and dielectric protection for construction site personnel.',
  },
  {
    title: 'LED Street Lighting Luminaires with Surge Protection',
    category: 'Electronics',
    query: 'Outdoor LED street lighting luminaires 90W to 120W with built-in electronic controlgear, IP66 waterproof enclosure, and 10kV surge protection device for municipal smart city roadway illumination.',
  },
  {
    title: 'Gold Bullion & Jewellery Hallmarking',
    category: 'Precious Metals',
    query: 'Procurement specification for gold bars, 22-carat gold coin medallions, and precious metal assaying with certified purity testing and six-digit alphanumeric HUID hallmarking conformity.',
  },
];

export const MOCK_STANDARDS_DATABASE: Record<string, RecommendedStandard[]> = {
  default: [
    {
      standard_number: 'IS 694 : 2010',
      title: 'Polyvinyl Chloride Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductor for Working Voltages up to and Including 1100 V',
      similarity_score: 0.96,
      category: 'Electrical',
      certification_badge: 'BIS Product Certification',
      year_published: '2010',
      scope_description: 'Covers single-core and multi-core PVC insulated and sheathed cables with copper/aluminum conductors for power, lighting, and internal wiring up to 1100V AC.',
      mandatory: true,
      source: 'Electrical Wires and Cables (Quality Control) Order, 2023 / Gazette S.O. 4512(E)',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+694',
    },
    {
      standard_number: 'IS 1554 (Part 1) : 1988',
      title: 'PVC Insulated (Heavy Duty) Electric Cables: Part 1 for Working Voltages up to and Including 1100 V',
      similarity_score: 0.89,
      category: 'Electrical',
      certification_badge: 'BIS Product Certification',
      year_published: '1988',
      scope_description: 'Prescribes construction and testing of heavy-duty armoured and unarmoured PVC insulated cables for power transmission and industrial feeders.',
      mandatory: true,
      source: 'CPWD Specifications (Electrical Works) 2023 & BIS Act 2016 Schedule-I',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+1554',
    },
    {
      standard_number: 'IS 7098 (Part 1) : 1988',
      title: 'Cross-Linked Polyethylene (XLPE) Insulated Thermoplastic Sheathed Cables for Working Voltages up to 1100 V',
      similarity_score: 0.82,
      category: 'Electrical',
      certification_badge: 'BIS Product Certification',
      year_published: '1988',
      scope_description: 'Covers requirements for XLPE insulated cables with superior thermal rating for higher current-carrying capacities.',
      mandatory: false,
      source: 'National Electrical Code of India (SP 30) & CEA (Technical Standards) Regulations',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+7098',
    },
    {
      standard_number: 'IS 8130 : 2013',
      title: 'Conductors for Insulated Electric Cables and Flexible Cords',
      similarity_score: 0.76,
      category: 'Electrical',
      certification_badge: 'None',
      year_published: '2013',
      scope_description: 'Specifies nominal cross-sectional areas, conductor resistance limits, and dimensional criteria for plain or tinned annealed copper and aluminum conductors.',
      mandatory: false,
      source: 'BIS Compendium of Indian Standards on Conductors & Raw Materials',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+8130',
    }
  ],
  cement: [
    {
      standard_number: 'IS 269 : 2015',
      title: 'Specification for 33, 43, 53 Grade Ordinary Portland Cement',
      similarity_score: 0.98,
      category: 'Cement & Construction',
      certification_badge: 'BIS Product Certification',
      year_published: '2015',
      scope_description: 'Specifies manufacture, chemical and physical requirements for Ordinary Portland Cement of 33, 43, and 53 grades for general and structural construction.',
      mandatory: true,
      source: 'Cement (Quality Control) Order, 2024 / DPIIT Notification S.O. 1215(E)',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+269',
    },
    {
      standard_number: 'IS 1489 (Part 1) : 2015',
      title: 'Portland Pozzolana Cement - Specification: Part 1 Fly Ash Based',
      similarity_score: 0.91,
      category: 'Cement & Construction',
      certification_badge: 'BIS Product Certification',
      year_published: '2015',
      scope_description: 'Covers pozzolanic cement with flyash additions (15-35%) providing sulfate resistance and reduced heat of hydration for hydraulic structures.',
      mandatory: true,
      source: 'Ministry of Road Transport and Highways (MoRTH) Specifications Section 1000',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+1489',
    },
    {
      standard_number: 'IS 456 : 2000',
      title: 'Plain and Reinforced Concrete - Code of Practice (Fourth Revision)',
      similarity_score: 0.85,
      category: 'Cement & Construction',
      certification_badge: 'None',
      year_published: '2000',
      scope_description: 'Foundational national engineering code for structural design, durability, batching, curing, and testing of plain and reinforced concrete.',
      mandatory: false,
      source: 'National Building Code of India (NBC 2016) Group 1 & CPWD Works Manual',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+456',
    },
    {
      standard_number: 'IS 8041 : 1990',
      title: 'Specification for Rapid Hardening Portland Cement',
      similarity_score: 0.79,
      category: 'Cement & Construction',
      certification_badge: 'BIS Product Certification',
      year_published: '1990',
      scope_description: 'Prescribes rapid strength-gaining cement suitable for cold weather concreting, urgent road repairs, and pre-cast concrete manufacturing.',
      mandatory: true,
      source: 'Cement (Quality Control) Order / Indian Railways Works Manual Track Standards',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+8041',
    }
  ],
  safety: [
    {
      standard_number: 'IS 2925 : 1984',
      title: 'Specification for Industrial Safety Helmets',
      similarity_score: 0.97,
      category: 'Safety & PPE',
      certification_badge: 'BIS Product Certification',
      year_published: '1984',
      scope_description: 'Covers physical and performance requirements for helmets to protect industrial workers from falling objects and mechanical impact.',
      mandatory: true,
      source: 'Protective Equipment (Quality Control) Order, 2021 / Gazette S.O. 2387(E)',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+2925',
    },
    {
      standard_number: 'IS 15298 (Part 2) : 2016',
      title: 'Personal Protective Equipment - Safety Footwear',
      similarity_score: 0.88,
      category: 'Safety & PPE',
      certification_badge: 'BIS Product Certification',
      year_published: '2016',
      scope_description: 'Specifies basic and additional requirements for safety footwear equipped with impact-resistant toecaps (200 Joules) and slip resistance.',
      mandatory: true,
      source: 'Footwear Made from Leather and Other Materials (QCO), 2020 / DPIIT Mandate',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+15298',
    },
    {
      standard_number: 'IS 9473 : 2002',
      title: 'Respiratory Protective Devices - Filtering Half Masks to Protect Against Particles',
      similarity_score: 0.77,
      category: 'Safety & PPE',
      certification_badge: 'BIS Product Certification',
      year_published: '2002',
      scope_description: 'Prescribes requirements for particulate filtering half-masks (FFP1, FFP2, FFP3) against solid aerosols and non-toxic dust.',
      mandatory: true,
      source: 'Ministry of Health & Family Welfare Procurement Guidelines & BIS Act 2016',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+9473',
    }
  ],
  electronics: [
    {
      standard_number: 'IS 10322 (Part 5/Sec 3) : 2012',
      title: 'Luminaires: Part 5 Particular Requirements, Section 3 Luminaires for Road and Street Lighting',
      similarity_score: 0.95,
      category: 'Electronics',
      certification_badge: 'CRS',
      year_published: '2012',
      scope_description: 'Specifies requirements for road lighting luminaires, weatherproofing, thermal endurance, vibration resistance, and optical performance.',
      mandatory: true,
      source: 'Electronics and IT Goods (Requirement for Compulsory Registration) Order / MeitY Gazette',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+10322',
    },
    {
      standard_number: 'IS 16103 (Part 1) : 2012',
      title: 'Led Modules for General Lighting: Part 1 Safety Requirements',
      similarity_score: 0.89,
      category: 'Electronics',
      certification_badge: 'CRS',
      year_published: '2012',
      scope_description: 'Covers general and electrical safety requirements for light-emitting diode (LED) modules operating with constant voltage or current.',
      mandatory: true,
      source: 'Bureau of Energy Efficiency (BEE) Star Labeling Mandate & MeitY CRO',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+16103',
    },
    {
      standard_number: 'IS 15885 (Part 2/Sec 13) : 2012',
      title: 'Lamp Controlgear: Particular Requirements for D.C. or A.C. Supplied Electronic Controlgear for LED Modules',
      similarity_score: 0.84,
      category: 'Electronics',
      certification_badge: 'CRS',
      year_published: '2012',
      scope_description: 'Prescribes safety and insulation requirements for drivers supplying LED arrays in public lighting systems.',
      mandatory: true,
      source: 'Energy Efficiency Services Limited (EESL) National Street Lighting Program Technical Spec',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+15885',
    }
  ],
  hallmarking: [
    {
      standard_number: 'IS 1417 : 2016',
      title: 'Gold and Gold Alloys, Platinum and Silver - Fineness and Marking (Hallmarking of Precious Metal Artefacts)',
      similarity_score: 0.98,
      category: 'Precious Metals',
      certification_badge: 'Hallmarking',
      year_published: '2016',
      scope_description: 'Specifies degrees of fineness, hallmarking symbols, and six-digit alphanumeric HUID (Hallmark Unique Identification) for gold and silver artefacts.',
      mandatory: true,
      source: 'Hallmarking of Gold Jewellery and Gold Artefacts Order, 2020 / Ministry of Consumer Affairs',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+1417',
    },
    {
      standard_number: 'IS 1418 : 2009',
      title: 'Assaying of Gold in Gold Bullion, Gold Alloys and Gold Jewellery/Artefacts - Cupellation (Fire Assay) Method',
      similarity_score: 0.90,
      category: 'Precious Metals',
      certification_badge: 'None',
      year_published: '2009',
      scope_description: 'Referee method for precise quantitative determination of gold content through fire assay cupellation.',
      mandatory: false,
      source: 'BIS Assaying & Hallmarking Centres Recognition Scheme Rules',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+1418',
    },
    {
      standard_number: 'IS 2112 : 2014',
      title: 'Silver and Silver Alloys - Fineness and Marking',
      similarity_score: 0.81,
      category: 'Precious Metals',
      certification_badge: 'Hallmarking',
      year_published: '2014',
      scope_description: 'Defines permissible purity grades (999, 990, 925 Sterling, 800) and marks of conformity for silver bullion and decorative items.',
      mandatory: false,
      source: 'Silver Artefacts Hallmarking Scheme / Gazette of India Notification',
      source_url: 'https://standardsbis.bsbedge.com/BIS_Search/StandardDetails.aspx?Std_Number=IS+2112',
    }
  ]
};

export const MOCK_ALLIED_STANDARDS: Record<string, AlliedStandardsGrouped> = {
  // Keyed by normalized IS number
  'IS 694 : 2010': {
    test_method: [
      {
        standard_number: 'IS 10810 (Part 1 to 64)',
        title: 'Methods of Test for Cables (Tensile, Elongation, Spark, Breakdown Voltage, Flame Retardance)',
        relationship_type: 'test_method',
        description: 'Comprehensive test standard series specifying physical, electrical, and thermal endurance protocols for PVC insulated cables.',
        is_mandatory: true,
      },
      {
        standard_number: 'IS 10810 (Part 53)',
        title: 'Methods of Test for Cables: Part 53 Oxygen Index Test',
        relationship_type: 'test_method',
        description: 'Determines flammability characteristics and minimum oxygen concentration to support candle-like combustion.',
        is_mandatory: true,
      },
    ],
    safety: [
      {
        standard_number: 'IS 1554 (Part 1)',
        title: 'PVC Insulated (Heavy Duty) Electric Cables for Voltages up to 1100 V',
        relationship_type: 'safety',
        description: 'Safety specification for heavy-duty industrial feeder cables with steel tape or wire armour protection.',
        is_mandatory: true,
      },
      {
        standard_number: 'IS/IEC 60332-1',
        title: 'Tests on Electric and Optical Fibre Cables Under Fire Conditions',
        relationship_type: 'safety',
        description: 'Test for vertical flame propagation for a single small vertical insulated wire or cable.',
        is_mandatory: false,
      },
    ],
    terminology: [
      {
        standard_number: 'IS 1885 (Part 32)',
        title: 'Electrotechnical Vocabulary: Part 32 Electric Cables',
        relationship_type: 'terminology',
        description: 'Defines official technical nomenclature for conductors, insulations, fillers, sheaths, and armouring.',
        is_mandatory: false,
      },
    ],
    installation: [
      {
        standard_number: 'IS 732 : 2019',
        title: 'Code of Practice for Electrical Wiring Installations',
        relationship_type: 'installation',
        description: 'Prescribes rules for sizing, conduit routing, protective earthing, and terminal connections in institutional buildings.',
        is_mandatory: true,
      },
      {
        standard_number: 'IS 1255 : 1983',
        title: 'Code of Practice for Installation and Maintenance of Power Cables up to and Including 33 kV Rating',
        relationship_type: 'installation',
        description: 'Laying guidelines including trench depths, bending radiuses, cable jointing, and backfilling.',
        is_mandatory: false,
      },
    ],
    normative_reference: [
      {
        standard_number: 'IS 8130 : 2013',
        title: 'Conductors for Insulated Electric Cables and Flexible Cords',
        relationship_type: 'normative_reference',
        description: 'Normative specification for copper purity, electrical conductivity, and stranding tolerances.',
        is_mandatory: true,
      },
      {
        standard_number: 'IS 5831 : 1984',
        title: 'PVC Insulation and Sheath of Electric Cables',
        relationship_type: 'normative_reference',
        description: 'Compounding criteria, plasticizer limits, and thermal aging thresholds for Type A, B, and C compounds.',
        is_mandatory: true,
      },
    ],
  },

  'IS 269 : 2015': {
    test_method: [
      {
        standard_number: 'IS 4031 (Parts 1 to 15)',
        title: 'Methods of Physical Tests for Hydraulic Cement',
        relationship_type: 'test_method',
        description: 'Standard procedures for fineness (Blaine air permeability), standard consistency, initial/final setting time, and compressive strength.',
        is_mandatory: true,
      },
      {
        standard_number: 'IS 4032 : 1985',
        title: 'Method of Chemical Analysis of Hydraulic Cement',
        relationship_type: 'test_method',
        description: 'Referee chemical analysis protocols for insoluble residue, loss on ignition (LOI), magnesia, and alumina/iron ratio.',
        is_mandatory: true,
      },
      {
        standard_number: 'IS 3535 : 1986',
        title: 'Methods of Sampling for Hydraulic Cement',
        relationship_type: 'test_method',
        description: 'Lot inspection, grab sampling, and representative composite sample preparation guidelines.',
        is_mandatory: true,
      },
    ],
    safety: [
      {
        standard_number: 'IS 10262 : 2019',
        title: 'Concrete Mix Proportioning - Guidelines (Second Revision)',
        relationship_type: 'safety',
        description: 'Structural safety criteria for target mean compressive strength, water-binder ratio, and air entrainment.',
        is_mandatory: false,
      },
    ],
    terminology: [
      {
        standard_number: 'IS 4845 : 1968',
        title: 'Definitions and Terminology Relating to Hydraulic Cement',
        relationship_type: 'terminology',
        description: 'Defines terminology regarding clinker, pozzolanas, gypsum retarding agents, and hydration properties.',
        is_mandatory: false,
      },
    ],
    installation: [
      {
        standard_number: 'IS 456 : 2000',
        title: 'Plain and Reinforced Concrete - Code of Practice',
        relationship_type: 'installation',
        description: 'Engineering code governing minimum cement content, maximum water-cement ratio, placement, compaction, and curing periods.',
        is_mandatory: true,
      },
    ],
    normative_reference: [
      {
        standard_number: 'IS 650 : 1991',
        title: 'Standard Sand for Testing of Cement - Specification',
        relationship_type: 'normative_reference',
        description: 'Specifies Ennore standard sand grading used universally across India for testing mortar compressive strength.',
        is_mandatory: true,
      },
    ],
  },

  'IS 2925 : 1984': {
    test_method: [
      {
        standard_number: 'IS 2925 (Clause 10 & 11)',
        title: 'Shock Absorption and Penetration Resistance Testing Protocols',
        relationship_type: 'test_method',
        description: 'Free-fall 5kg hemispherical striker impact test and 3kg conical drop test onto helmet apex mounted on standard headform.',
        is_mandatory: true,
      },
      {
        standard_number: 'IS 2925 (Clause 12)',
        title: 'Flammability and Electrical Resistance (Dielectric) Testing',
        relationship_type: 'test_method',
        description: 'Verifies self-extinguishing behavior within 5 seconds and leakage current under 3mA at 2000V RMS AC.',
        is_mandatory: true,
      },
    ],
    safety: [
      {
        standard_number: 'IS 8519 : 1977',
        title: 'Guide for Selection of Industrial Safety Equipment for Head Protection',
        relationship_type: 'safety',
        description: 'Hazard identification and criteria for allocating Class A (general), Class B (high voltage electrical), or Class C helmets.',
        is_mandatory: false,
      },
    ],
    terminology: [
      {
        standard_number: 'IS 15809 : 2008',
        title: 'High Visibility Warning Clothes and Headgear - Nomenclature',
        relationship_type: 'terminology',
        description: 'Standardized terminology for retroreflective materials, shell profiles, harnesses, and nape straps.',
        is_mandatory: false,
      },
    ],
    installation: [
      {
        standard_number: 'IS 8807 : 1978',
        title: 'Guide for Display and Maintenance of Personal Protective Equipment in Industrial Plants',
        relationship_type: 'installation',
        description: 'Storage guidelines, UV degradation inspection intervals, and mandatory shelf-life retirement criteria for polymer shells.',
        is_mandatory: false,
      },
    ],
    normative_reference: [
      {
        standard_number: 'IS 7621 : 1975',
        title: 'Specification for Headforms for Helmet Testing',
        relationship_type: 'normative_reference',
        description: 'Dimensional and mass properties of timber or metallic headforms for impact force measurement.',
        is_mandatory: true,
      },
    ],
  },

  'IS 10322 (Part 5/Sec 3) : 2012': {
    test_method: [
      {
        standard_number: 'IS 16106 : 2012',
        title: 'Methods of Electrical and Photometric Measurements of Solid-State Lighting (LED) Products',
        relationship_type: 'test_method',
        description: 'Standard method for calculating luminous flux (lumens), luminous efficacy (lm/W), and correlated colour temperature (CCT).',
        is_mandatory: true,
      },
      {
        standard_number: 'IS/IEC 60529',
        title: 'Degrees of Protection Provided by Enclosures (IP Code)',
        relationship_type: 'test_method',
        description: 'Test protocol verifying IP65/IP66 ingress protection against high-velocity water jets and dust penetration.',
        is_mandatory: true,
      },
    ],
    safety: [
      {
        standard_number: 'IS 15885 (Part 2/Sec 13)',
        title: 'Lamp Controlgear: Particular Requirements for Electronic Controlgear for LED Modules',
        relationship_type: 'safety',
        description: 'Electrical isolation, over-voltage protection, and short-circuit protection requirements under BIS CRS scheme.',
        is_mandatory: true,
      },
      {
        standard_number: 'IS 16103 (Part 1)',
        title: 'Led Modules for General Lighting: Safety Requirements',
        relationship_type: 'safety',
        description: 'Ensures thermal dissipation safeguards and prevents blue-light optical radiation hazards (IEC 62471).',
        is_mandatory: true,
      },
    ],
    terminology: [
      {
        standard_number: 'IS 16101 : 2012',
        title: 'General Lighting - LEDs and LED Modules - Terms and Definitions',
        relationship_type: 'terminology',
        description: 'Official definitions for LED binning, lumen maintenance (L70/L80/L90), driver efficiency, and chromaticity tolerance.',
        is_mandatory: false,
      },
    ],
    installation: [
      {
        standard_number: 'IS 1944 (Parts 1 & 2)',
        title: 'Code of Practice for Lighting of Public Thoroughfares',
        relationship_type: 'installation',
        description: 'Municipal engineering code for pole mounting heights, overhang, spacing-to-height ratio, and roadway luminance levels.',
        is_mandatory: true,
      },
    ],
    normative_reference: [
      {
        standard_number: 'IS 16107 (Part 2/Sec 1)',
        title: 'Luminaires Performance: Part 2 Particular Requirements, Section 1 LED Luminaires',
        relationship_type: 'normative_reference',
        description: 'Operational performance, lifetime expectancy criteria, and power factor requirements (>0.95).',
        is_mandatory: true,
      },
    ],
  },

  'IS 1417 : 2016': {
    test_method: [
      {
        standard_number: 'IS 1418 : 2009',
        title: 'Assaying of Gold in Gold Bullion, Gold Alloys and Gold Jewellery/Artefacts - Cupellation Method',
        relationship_type: 'test_method',
        description: 'Chemical fire assay protocol for determining precious metal purity with accuracy within ±0.5 parts per thousand.',
        is_mandatory: true,
      },
      {
        standard_number: 'IS 2113 : 2014',
        title: 'Assaying of Silver in Silver Alloys - Volumetric (Potentiometric) Method',
        relationship_type: 'test_method',
        description: 'Analytical chemical titration method for certifying sterling and fine silver lots.',
        is_mandatory: true,
      },
    ],
    safety: [
      {
        standard_number: 'IS 15820 : 2009',
        title: 'General Requirements for Competence of Assaying and Hallmarking Centres (AHC)',
        relationship_type: 'safety',
        description: 'Security, sample traceability, chain of custody, and environmental emission controls during acid parting and lead fuming.',
        is_mandatory: true,
      },
    ],
    terminology: [
      {
        standard_number: 'IS 2112 : 2014',
        title: 'Silver and Silver Alloys - Fineness and Marking',
        relationship_type: 'terminology',
        description: 'Official hallmarking stamps, purity carats conversion tables, and manufacturer sponsor mark regulations.',
        is_mandatory: false,
      },
    ],
    installation: [
      {
        standard_number: 'IS 14454 : 2012',
        title: 'Sampling of Gold and Gold Alloys - Guidelines',
        relationship_type: 'installation',
        description: 'Non-destructive sampling procedures using scraping or pin-drilling without diminishing aesthetic value of bullion/artefact.',
        is_mandatory: true,
      },
    ],
    normative_reference: [
      {
        standard_number: 'IS/ISO 11426',
        title: 'Determination of Gold in Gold Jewellery Alloys - Cupellation Method',
        relationship_type: 'normative_reference',
        description: 'Harmonized international ISO normative benchmark for fire assay furnace temperature calibrations.',
        is_mandatory: true,
      },
    ],
  },
};

// Generic fallback allied standards for any other standard number
export const GENERIC_ALLIED_STANDARDS = (standardNumber: string): AlliedStandardsGrouped => ({
  test_method: [
    {
      standard_number: 'IS 1060 (Part 1)',
      title: 'Methods of Sampling and Test for Quality Evaluation',
      relationship_type: 'test_method',
      description: 'Prescribes statistical sampling techniques and laboratory repeatability protocols.',
      is_mandatory: true,
    },
    {
      standard_number: 'IS 4905 : 2015',
      title: 'Random Sampling and Randomization Procedures',
      relationship_type: 'test_method',
      description: 'Indian Standard guidance for picking representative production batches for third-party lab conformity.',
      is_mandatory: false,
    },
  ],
  safety: [
    {
      standard_number: 'IS/ISO 45001 : 2018',
      title: 'Occupational Health and Safety Management Systems - Requirements',
      relationship_type: 'safety',
      description: 'Requirements with guidance for safe manufacturing, handling, and operational containment.',
      is_mandatory: false,
    },
  ],
  terminology: [
    {
      standard_number: 'IS 1387 : 1993',
      title: 'General Requirements for the Supply of Metallurgical and Engineering Materials',
      relationship_type: 'terminology',
      description: 'Nomenclature, order placement definitions, and acceptance certificate classification.',
      is_mandatory: false,
    },
  ],
  installation: [
    {
      standard_number: 'SP 30 (S&T)',
      title: 'National Electrical and Works Installation Handbook',
      relationship_type: 'installation',
      description: 'Code of practice for on-site commissioning, inspection protocols, and maintenance guidelines.',
      is_mandatory: false,
    },
  ],
  normative_reference: [
    {
      standard_number: 'IS 9000 (Part 1)',
      title: 'Basic Environmental Testing Procedures for Electronic and Electrical Items',
      relationship_type: 'normative_reference',
      description: 'Underpinning normative climatic and mechanical durability specification.',
      is_mandatory: true,
    },
  ],
});

// Translation dictionary for realistic demo simulation
export const MOCK_TRANSLATION_MAP: Record<string, string> = {
  // Hindi examples
  'बिजली का तार': 'electric cable wire copper PVC insulated 1100V',
  'सीमेंट और कंक्रीट': 'cement and concrete Ordinary Portland Cement 43 grade bridge culvert',
  'सुरक्षा हेलमेट': 'industrial safety helmet head protection construction PPE',
  'सड़क की लाइट एलईडी': 'outdoor street lighting LED luminaires surge protection 120W',
  'सोना हॉलमार्किंग': 'gold jewellery hallmarking assaying purity verification',
};
