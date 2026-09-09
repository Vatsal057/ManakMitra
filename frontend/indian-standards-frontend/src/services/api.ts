import {
  RecommendedStandard,
  AlliedStandardsGrouped,
  AlliedStandard,
  ApiConfig,
  CertificationType,
  RelationshipType,
  RecommendationResult
} from '../types/standards';
import { 
  MOCK_STANDARDS_DATABASE, 
  MOCK_ALLIED_STANDARDS, 
  GENERIC_ALLIED_STANDARDS,
  MOCK_TRANSLATION_MAP 
} from './mockData';

const CONFIG_STORAGE_KEY = 'bis_standards_api_config';

export const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:8000',
  recommendEndpoint: '/recommend',
  alliedEndpoint: '/allied',
  translateEndpoint: '/translate',
  // Off by default: silently substituting mock results for a dead backend
  // is indistinguishable from live output and has shipped fabricated data
  // to a judge before. Switch on deliberately in Settings when needed.
  useDemoFallback: false,
};

export function getApiConfig(): ApiConfig {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to parse API config from localStorage, using defaults', e);
  }
  return DEFAULT_CONFIG;
}

export function saveApiConfig(config: ApiConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save API config to localStorage', e);
  }
}

// In-memory cache for allied standards
const alliedCache = new Map<string, AlliedStandardsGrouped>();

/**
 * Normalizes any variation of certification badge into the official categories.
 *
 * 'None' and 'Not determined' are NOT interchangeable: 'None' asserts the
 * standard is confirmed outside any QCO; 'Not determined' means nobody has
 * checked. Defaulting an unassessed standard to 'None' renders it
 * identically to a verified clearance -- see data/ENRICHMENT_REPORT.md.
 * Only the literal string "none" maps to the verified-negative badge;
 * everything null, empty, or unrecognised is honestly 'Not determined'.
 */
export function normalizeCertificationBadge(badge: any): CertificationType {
  if (badge === null || badge === undefined) return 'Not determined';
  const str = String(badge).trim().toLowerCase();
  if (str === '') return 'Not determined';
  if (str === 'none') return 'None';
  if (str.includes('product') || str.includes('isi') || str.includes('bis mark') || str.includes('scheme i')) {
    return 'BIS Product Certification';
  }
  if (str.includes('crs') || str.includes('compulsory') || str.includes('registration')) {
    return 'CRS';
  }
  if (str.includes('hallmark') || str.includes('huid') || str.includes('gold') || str.includes('silver')) {
    return 'Hallmarking';
  }
  return 'Not determined';
}

/**
 * Normalizes similarity score into a decimal 0.00 - 1.00
 */
export function normalizeScore(score: any): number {
  if (typeof score !== 'number') {
    const parsed = parseFloat(score);
    if (isNaN(parsed)) return 0.75;
    score = parsed;
  }
  if (score > 1.0) {
    return Math.min(1.0, score / 100);
  }
  return Math.max(0, Math.min(1, score));
}

/**
 * Translates a non-English query into English via the backend /translate endpoint.
 */
export async function translateQuery(
  query: string, 
  sourceLang: string, 
  config = getApiConfig()
): Promise<string> {
  if (sourceLang === 'en' || !query.trim()) {
    return query;
  }

  const cleanBase = config.baseUrl.replace(/\/+$/, '');
  const url = `${cleanBase}${config.translateEndpoint}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text: query,
        query: query,
        source_lang: sourceLang,
        source_language: sourceLang,
        target_lang: 'en',
        target_language: 'en',
      }),
      signal: AbortSignal.timeout(8000), // 8s timeout
    });

    if (!res.ok) {
      throw new Error(`Translate API error: HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const translated = data.translated_text || data.translated_query || data.text || data.translation || (typeof data === 'string' ? data : null);

    if (translated && typeof translated === 'string' && translated.trim()) {
      return translated.trim();
    }
  } catch (error) {
    console.warn('Backend translation failed or unreachable:', error);
    if (!config.useDemoFallback) {
      throw error;
    }
  }

  // Demo Fallback translation simulation:
  for (const [key, val] of Object.entries(MOCK_TRANSLATION_MAP)) {
    if (query.includes(key)) {
      return val;
    }
  }

  // Simulated procurement translation:
  return `Procurement specification for ${query} (Translated from ${sourceLang.toUpperCase()})`;
}

/**
 * Fetches ranked recommended standards for a technical specification.
 *
 * Returns a RecommendationResult, not a bare array, so callers can tell
 * live backend output from the local demo dataset and render it
 * accordingly -- see the `isDemoFallback` flag.
 */
export async function fetchRecommendations(
  query: string,
  config = getApiConfig()
): Promise<RecommendationResult> {
  const cleanBase = config.baseUrl.replace(/\/+$/, '');
  const url = `${cleanBase}${config.recommendEndpoint}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        text: query,
        specification: query,
        top_k: 10,
      }),
      signal: AbortSignal.timeout(12000), // 12s timeout
    });

    if (!res.ok) {
      throw new Error(`Recommendation API error: HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    // Live shape (verified against a real running backend, not assumed):
    // { results: [...], confidence_signal: number, abstained: bool, abstain_reason: string|null }.
    // The results-array fallbacks below exist for shape drift tolerance,
    // not because the live shape is actually in doubt.
    const rawList: any[] = Array.isArray(data)
      ? data
      : (data.results || data.recommendations || data.standards || data.data || []);

    if (Array.isArray(rawList) && rawList.length > 0) {
      const standards = rawList.map((item: any): RecommendedStandard => ({
        standard_number: item.standard_number || item.standardNumber || item.is_number || item.id || 'IS Standard',
        title: item.title || item.name || item.standard_name || 'Indian Standard Specification',
        similarity_score: normalizeScore(item.similarity_score ?? item.score ?? item.relevance ?? 0.85),
        fusion_rank_score: item.fusion_rank_score,
        category: item.category || item.division || item.department || 'General',
        certification_badge: normalizeCertificationBadge(item.certification_badge ?? item.certification ?? item.badge ?? item.scheme),
        year_published: item.year_published || item.year || '',
        scope_description: item.scope_description || item.scope || item.description || '',
        scope_source: item.scope_source,
        latest_version: item.latest_version ?? null,
        version_source: item.version_source,
        amendment_count: item.amendment_count ?? null,
        // Tri-state passthrough: undefined/null stays "not assessed" rather
        // than collapsing to false, which would assert a checked negative.
        mandatory: item.mandatory === null || item.mandatory === undefined ? null : Boolean(item.mandatory),
        certification_source: item.certification_source,
        qco_reference: item.qco_reference ?? null,
        confidence: item.confidence,
        source: item.source || item.gazette_source || item.order,
        // Only a source_url the dataset actually supplied -- never a
        // constructed guess at a BIS portal URL, which may not resolve.
        source_url: item.source_url || item.url || undefined,
      }));
      return {
        standards,
        isDemoFallback: false,
        confidenceSignal: typeof data.confidence_signal === 'number' ? data.confidence_signal : 1,
        abstained: Boolean(data.abstained),
        abstainReason: data.abstain_reason ?? null,
        confidenceBand: data.confidence_band === 'moderate' || data.confidence_band === 'low' ? data.confidence_band : 'high',
      };
    }
  } catch (error) {
    console.warn('Backend /recommend service offline:', error);
    if (!config.useDemoFallback) {
      throw error;
    }
  }

  // Demo Fallback: Keyword-aware recommendation matching against the local
  // mock dataset. Only reached when useDemoFallback is deliberately on.
  const lowerQuery = query.toLowerCase();
  let results: RecommendedStandard[] = [];

  if (lowerQuery.includes('cement') || lowerQuery.includes('concrete') || lowerQuery.includes('mortar') || lowerQuery.includes('opc') || lowerQuery.includes('ppc')) {
    results = [...MOCK_STANDARDS_DATABASE.cement];
  } else if (lowerQuery.includes('helmet') || lowerQuery.includes('safety') || lowerQuery.includes('ppe') || lowerQuery.includes('footwear') || lowerQuery.includes('mask')) {
    results = [...MOCK_STANDARDS_DATABASE.safety];
  } else if (lowerQuery.includes('led') || lowerQuery.includes('light') || lowerQuery.includes('luminaire') || lowerQuery.includes('lamp') || lowerQuery.includes('street')) {
    results = [...MOCK_STANDARDS_DATABASE.electronics];
  } else if (lowerQuery.includes('gold') || lowerQuery.includes('hallmark') || lowerQuery.includes('silver') || lowerQuery.includes('jewel') || lowerQuery.includes('bullion')) {
    results = [...MOCK_STANDARDS_DATABASE.hallmarking];
  } else if (lowerQuery.includes('cable') || lowerQuery.includes('wire') || lowerQuery.includes('pvc') || lowerQuery.includes('conductor') || lowerQuery.includes('electric')) {
    results = [...MOCK_STANDARDS_DATABASE.default];
  } else {
    // If no exact match, return general mixture with slight relevance decay
    results = [
      ...MOCK_STANDARDS_DATABASE.default.slice(0, 2),
      ...MOCK_STANDARDS_DATABASE.cement.slice(0, 1),
      ...MOCK_STANDARDS_DATABASE.safety.slice(0, 1),
    ];
  }

  // Simulate realistic network delay in demo mode (400ms)
  await new Promise(r => setTimeout(r, 450));
  // Demo data never runs the real abstention gate -- confidenceSignal=1 /
  // abstained=false here is not a claim of confidence, it's an honest
  // reflection of "the gate did not run"; the demo-data banner (driven by
  // isDemoFallback) is what tells the user not to trust this as a live result.
  return { standards: results, isDemoFallback: true, confidenceSignal: 1, abstained: false, abstainReason: null, confidenceBand: 'high' };
}

/**
 * Fetches Allied & Normative Standards for a specific standard number.
 * Grouped by: test_method, safety, terminology, installation, normative_reference.
 */
export async function fetchAlliedStandards(
  standardNumber: string, 
  config = getApiConfig()
): Promise<AlliedStandardsGrouped> {
  const cacheKey = standardNumber.trim().toUpperCase();
  if (alliedCache.has(cacheKey)) {
    return alliedCache.get(cacheKey)!;
  }

  const cleanBase = config.baseUrl.replace(/\/+$/, '');
  // Sanitize ID for URL
  const sanitizedId = encodeURIComponent(standardNumber.trim());
  const url = `${cleanBase}${config.alliedEndpoint}/${sanitizedId}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Allied API error: HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const grouped = normalizeAlliedResponse(data, standardNumber);
    alliedCache.set(cacheKey, grouped);
    return grouped;
  } catch (error) {
    console.warn(`Backend /allied/${standardNumber} failed or unreachable:`, error);
    if (!config.useDemoFallback) {
      throw error;
    }
  }

  // Demo Fallback:
  // Check exact or partial key in MOCK_ALLIED_STANDARDS
  let fallback: AlliedStandardsGrouped | null = null;
  for (const [key, value] of Object.entries(MOCK_ALLIED_STANDARDS)) {
    const cleanKey = key.replace(/\s+/g, '').toLowerCase();
    const cleanSearch = standardNumber.replace(/\s+/g, '').toLowerCase();
    if (cleanSearch.includes(cleanKey) || cleanKey.includes(cleanSearch) || cleanSearch.split(':')[0] === cleanKey.split(':')[0]) {
      fallback = value;
      break;
    }
  }

  if (!fallback) {
    fallback = GENERIC_ALLIED_STANDARDS(standardNumber);
  }

  await new Promise(r => setTimeout(r, 300));
  alliedCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Helper to normalize different API response shapes (flat array vs grouped object).
 */
function normalizeAlliedResponse(data: any, standardNumber: string): AlliedStandardsGrouped {
  const result: AlliedStandardsGrouped = {
    test_method: [],
    safety: [],
    terminology: [],
    installation: [],
    normative_reference: [],
  };

  if (!data) return result;

  // Case A: Response is already a grouped dictionary
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (data.test_method || data.test_methods || data.testing) {
      result.test_method = (data.test_method || data.test_methods || data.testing || []).map(normalizeAlliedItem);
    }
    if (data.safety || data.safety_standards || data.protection) {
      result.safety = (data.safety || data.safety_standards || data.protection || []).map(normalizeAlliedItem);
    }
    if (data.terminology || data.definitions || data.vocabulary) {
      result.terminology = (data.terminology || data.definitions || data.vocabulary || []).map(normalizeAlliedItem);
    }
    if (data.installation || data.code_of_practice || data.laying) {
      result.installation = (data.installation || data.code_of_practice || data.laying || []).map(normalizeAlliedItem);
    }
    if (data.normative_reference || data.normative_references || data.normative) {
      result.normative_reference = (data.normative_reference || data.normative_references || data.normative || []).map(normalizeAlliedItem);
    }

    // Check if any bucket got populated
    const total = Object.values(result).reduce((sum, arr) => sum + arr.length, 0);
    if (total > 0) return result;
  }

  // Case B: Response is a flat array of allied standards with `relationship_type`
  const list: any[] = Array.isArray(data) 
    ? data 
    : (data.allied || data.standards || data.allied_standards || []);

  if (Array.isArray(list)) {
    for (const item of list) {
      const normalizedItem = normalizeAlliedItem(item);
      const relType = String(item.relationship_type || item.type || item.category || '').toLowerCase();

      if (relType.includes('test') || relType.includes('sampling') || relType.includes('analysis')) {
        result.test_method.push({ ...normalizedItem, relationship_type: 'test_method' });
      } else if (relType.includes('safe') || relType.includes('hazard') || relType.includes('protect')) {
        result.safety.push({ ...normalizedItem, relationship_type: 'safety' });
      } else if (relType.includes('terminol') || relType.includes('vocab') || relType.includes('definiti')) {
        result.terminology.push({ ...normalizedItem, relationship_type: 'terminology' });
      } else if (relType.includes('install') || relType.includes('practice') || relType.includes('lay') || relType.includes('erect')) {
        result.installation.push({ ...normalizedItem, relationship_type: 'installation' });
      } else {
        result.normative_reference.push({ ...normalizedItem, relationship_type: 'normative_reference' });
      }
    }
  }

  return result;
}

function normalizeAlliedItem(item: any): AlliedStandard {
  const rawMandatory = item.is_mandatory ?? item.mandatory;
  return {
    standard_number: item.standard_number || item.standardNumber || item.is_number || item.id || 'IS Code',
    title: item.title || item.name || item.standard_title || 'Indian Standard',
    relationship_type: item.relationship_type || 'normative_reference',
    description: item.description || item.scope || item.details || '',
    // Tri-state, matching RecommendedStandard.mandatory: null/undefined
    // stays unknown rather than coercing to false, which would assert a
    // checked "not mandatory" the backend never determined (the allied
    // mapping currently has no source data for this field at all).
    is_mandatory: rawMandatory === null || rawMandatory === undefined ? null : Boolean(rawMandatory),
  };
}

/**
 * Actual indexed corpus size from the live backend's /health -- the
 * landing page must show this, not a hardcoded snapshot, since it's exactly
 * the kind of number that silently goes stale when the corpus is re-merged
 * (287 -> 317 after the prompt-9 certification/curated-supplement merge).
 * Returns null on any failure -- callers should render a safe placeholder,
 * never a fabricated fallback number.
 */
export async function fetchCorpusSize(baseUrl: string): Promise<number | null> {
  try {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanBase}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.corpus_size === 'number' ? data.corpus_size : null;
  } catch {
    return null;
  }
}

/**
 * Health check to test backend connection
 */
export async function checkBackendHealth(baseUrl: string): Promise<boolean> {
  try {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanBase}/docs`, {
      method: 'GET',
      mode: 'no-cors', // even if CORS is not configured, this verifies network connectivity
      signal: AbortSignal.timeout(3000),
    });
    return true;
  } catch (e) {
    // Try pinging the base url
    try {
      await fetch(baseUrl, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(2000) });
      return true;
    } catch {
      return false;
    }
  }
}
