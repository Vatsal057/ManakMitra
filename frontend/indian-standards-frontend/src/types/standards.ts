export type CertificationType =
  | 'BIS Product Certification'
  | 'CRS'
  | 'Hallmarking'
  | 'None'
  | 'Not determined';

// Provenance enums produced by the data pipeline (see data/ENRICHMENT_REPORT.md).
// 'drafted' scope text is written by a human when scraping failed, not scraped or invented.
export type ScopeSource = 'scraped' | 'title_fallback' | 'drafted';
export type CertificationSource = 'qco_gazette' | 'crs_product_list' | 'public_knowledge' | 'not_assessed';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface RecommendedStandard {
  standard_number: string;
  title: string;
  similarity_score: number; // dense cosine similarity -- the honest confidence value, 0.0-1.0
  // RRF ranking score, ordering/debugging only. MUST NEVER be rendered as a
  // confidence figure -- RRF's rank-1 contribution is identical whether the
  // match is perfect or nonsense (see data/eval/RESULTS.md). Kept on the
  // type for fidelity with the wire response; no component may display it.
  fusion_rank_score?: number;
  category: string;
  certification_badge: CertificationType | string;
  year_published?: string | number;
  scope_description?: string;
  // Whether scope_description was actually scraped, or is a fallback with
  // little-to-no independent signal beyond the title. Surfaced in the UI
  // because it materially affects how much to trust the recommendation.
  scope_source?: ScopeSource;
  // Canonical published edition, e.g. "IS 456:2000" -- derived from
  // year_published, not a currency check against later revisions.
  latest_version?: string | null;
  version_source?: string;
  amendment_count?: number | null;
  // Tri-state: true (confirmed mandatory), false (confirmed not mandatory),
  // null/undefined (not assessed). Never default this to false.
  mandatory?: boolean | null;
  certification_source?: CertificationSource;
  qco_reference?: string | null;
  confidence?: ConfidenceLevel;
  source?: string;
  source_url?: string;
}

export type RelationshipType = 
  | 'test_method'
  | 'safety'
  | 'terminology'
  | 'installation'
  | 'normative_reference';

export interface AlliedStandard {
  standard_number: string;
  title: string;
  relationship_type: RelationshipType | string;
  description?: string;
  is_mandatory?: boolean | null; // tri-state -- the mapping has no source data for this field, always null today
}

export interface AlliedStandardsGrouped {
  test_method: AlliedStandard[];
  safety: AlliedStandard[];
  terminology: AlliedStandard[];
  installation: AlliedStandard[];
  normative_reference: AlliedStandard[];
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  scriptBadge?: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

export interface ApiConfig {
  baseUrl: string;
  recommendEndpoint: string;
  alliedEndpoint: string;
  translateEndpoint: string;
  useDemoFallback: boolean;
}

// Wraps a recommendation result with whether it came from the live backend
// or the local demo dataset -- the UI must never present the two identically
// -- and with the backend's abstention verdict for the query as a whole.
export interface RecommendationResult {
  standards: RecommendedStandard[];
  isDemoFallback: boolean;
  // Dense-cosine confidence signal for the whole query, independent of RRF.
  // Demo-fallback responses don't run the real gate, so this is always 1
  // and abstained is always false there -- not a claim of confidence, just
  // an honest reflection of "the abstention gate did not run."
  confidenceSignal: number;
  abstained: boolean;
  abstainReason?: string | null;
  // Graded confidence band from the backend's compute_confidence(): "high" |
  // "moderate" | "low". Not yet consumed by any component -- ResultsList
  // still only branches on the `abstained` boolean, so a "moderate" result
  // currently renders identically to "high". Demo-fallback responses don't
  // run the real gate, so this is always "high" there, same rationale as
  // confidenceSignal above.
  confidenceBand: 'high' | 'moderate' | 'low';
}

// --- Tender audit mode ---

export interface MissingNormativeRef {
  cited_standard: string;
  missing_standard?: string | null;
  relationship_type?: RelationshipType | string | null;
  note?: string | null;
}

export interface ClauseFinding {
  clause_text: string;
  cited_standards: string[];
  suggested_standards: RecommendedStandard[];
  abstained: boolean;
  abstain_reason?: string | null;
  missing_normative_refs: MissingNormativeRef[];
  edition_notes: string[];
}

export interface AuditSummary {
  clauses_total: number;
  clauses_cited: number;
  clauses_uncited: number;
  missing_normative_refs_total: number;
  edition_mismatches_total: number;
}

export interface AuditResult {
  clauses: ClauseFinding[];
  summary: AuditSummary;
}

export interface RecommendationRequestState {
  isLoading: boolean;
  stepMessage?: string;
  error?: string | null;
  translationInfo?: TranslationResult | null;
}
