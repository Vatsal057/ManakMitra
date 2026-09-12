// Maps a standard's `category` field (from the /recommend API) to the labs
// dataset's `primaryCategory`/`secondaryCategories` vocabulary (Phase 9C,
// src/data/bisLabsData.js) — the two were classified independently and use
// different taxonomies, so this pairing is manual, not inferred at runtime.
//
// Discovered by sampling ~80 broad queries against the live API (covering
// ~280 of the corpus's 317 standards) and comparing the resulting set of
// standard categories against bisLabsData.js's 17 lab primaryCategory
// values. Every standard category seen is listed below, mapped to one or
// more lab categories, EXCEPT where no lab category is a reasonable match —
// those are deliberately left unmapped (see NearbyLabs.jsx: an unmapped
// category shows a "no confident match" state, not a silent fallback to
// unrelated labs).
//
// "General / Multi-sector" (273 of 431 labs — the low-confidence catch-all
// for labs whose specialty couldn't be classified) is intentionally never a
// mapping target: it isn't a specialty, so treating it as a category match
// would reintroduce exactly the noise this amendment exists to remove.
export const STANDARD_TO_LAB_CATEGORY = {
  // --- Direct or near-direct correspondences (same domain, different wording) ---
  'Cement & Construction': ['Construction & Cement'],
  Construction: ['Construction & Cement'],
  Chemicals: ['Chemical & Petrochemical'],
  Petroleum: ['Chemical & Petrochemical'],
  'Food & Agriculture': ['Food & Agriculture'],
  Metallurgy: ['Metal & Metallurgy'],
  'Precious Metals': ['Metal & Metallurgy'],
  'Test Methods - Metals': ['Metal & Metallurgy'],
  'Plastics & Rubber': ['Plastic, Rubber & Polymer'],
  'Safety & PPE': ['Safety & Protective Equipment'],
  Textiles: ['Textile & Leather'],
  Mechanical: ['Mechanical & Engineering'],
  'Water & Environment': ['Environmental & Water'],
  'Test Methods - Water': ['Environmental & Water'],
  'Medical & Healthcare': ['Pharmaceutical & Medical'],

  // --- Same domain, grouped differently — every electrical/electronic
  // standard sub-category collapses to the labs dataset's single combined
  // "Electrical & Electronics" primary category. ---
  Electrical: ['Electrical & Electronics'],
  'Electrical Appliances': ['Electrical & Electronics'],
  'Electrical Cables': ['Electrical & Electronics'],
  'Electrical Installation': ['Electrical & Electronics'],
  'Electrical Instrument Transformers': ['Electrical & Electronics'],
  'Electrical Insulators': ['Electrical & Electronics'],
  'Test Methods - Cables': ['Electrical & Electronics'],
  Electronics: ['Electrical & Electronics'],
  'Consumer Electronics': ['Electrical & Electronics'],
  'IT Equipment': ['Electrical & Electronics'],
  // Batteries are electrical energy-storage components — tested by
  // electrical/electronics labs, not a chemistry-of-contents match.
  Batteries: ['Electrical & Electronics'],

  // --- Reasoned, less direct mappings ---
  // Fasteners are mechanical hardware (bolts, nuts, screws) — closer to
  // general mechanical/engineering testing than any other category.
  Fasteners: ['Mechanical & Engineering'],
  // This standard category spans both halves of the labs dataset's split —
  // map to both rather than picking one and losing the other half's labs.
  'Food and Water': ['Food & Agriculture', 'Environmental & Water'],
  // Gas cylinder standards (e.g. LPG cylinders) are mostly about the metal
  // vessel's fabrication and pressure/burst testing, not the chemistry of
  // what's stored inside — mechanical/metallurgical labs are the closer
  // real-world match, not "Chemical & Petrochemical".
  'Gas Cylinders': ['Mechanical & Engineering', 'Metal & Metallurgy'],
  // Raw ore/mineral material testing overlaps with metallurgical labs more
  // than any other category on the labs side.
  'Mining & Minerals': ['Metal & Metallurgy'],

  // --- Deliberately unmapped — no lab category is a reasonable match, so
  // these are left out rather than guessed. NearbyLabs.jsx treats a standard
  // with one of these categories as "no confident match" (not the same as
  // "no category on record", and not a silent location-only fallback). ---
  // Toys: no lab category in the dataset is toy-specific; forcing a match to
  // "Safety & Protective Equipment" or "Plastic, Rubber & Polymer" would
  // overstate a connection we have no actual signal for.
  //
  // Uncategorized: not a real category — NearbyLabs.jsx treats this the same
  // as "no category value at all" (see hasCategory there), not as unmapped.
};

// Returns the mapped lab-category array for a standard category, or null if
// there's no confident mapping (including an unrecognised/unseen category —
// treated the same as "no reasonable match" rather than guessed).
export function getLabCategoriesForStandardCategory(standardCategory) {
  return STANDARD_TO_LAB_CATEGORY[standardCategory] ?? null;
}
