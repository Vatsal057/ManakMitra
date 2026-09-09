import { ApiConfig, AuditResult } from '../types/standards';
import { getApiConfig } from './api';

/**
 * Runs the tender specification audit against the live backend's POST
 * /audit endpoint. Deliberately has NO demo-data fallback: an audit result
 * (missing normative references, edition mismatches) is exactly the kind
 * of finding that must never be presented as real when it's actually a
 * fabricated stand-in -- unlike /recommend, there is no safe "illustrative
 * sample" version of this feature. If the backend is unreachable, this
 * throws, and the caller must show a real error state, not mock findings.
 */
export async function runTenderAudit(specText: string, config: ApiConfig = getApiConfig()): Promise<AuditResult> {
  const cleanBase = config.baseUrl.replace(/\/+$/, '');
  const url = `${cleanBase}/audit`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ spec_text: specText }),
    signal: AbortSignal.timeout(30000), // clause-by-clause retrieval can take a few seconds on a longer spec
  });

  if (!res.ok) {
    throw new Error(`Audit API error: HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    clauses: data.clauses || [],
    summary: data.summary || {
      clauses_total: 0,
      clauses_cited: 0,
      clauses_uncited: 0,
      missing_normative_refs_total: 0,
      edition_mismatches_total: 0,
    },
  };
}
