// src/api/client.js
//
// Every network call in the app goes through this module — no direct fetch
// in components. On non-2xx or a network failure, throws ApiError so the UI
// can distinguish "server responded with an error" from "unreachable".

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

if (!API_BASE) {
  console.warn('VITE_API_BASE_URL not set in .env.local; defaulting to relative same-origin API');
}

export class ApiError extends Error {
  constructor(message, type, status = null) {
    super(message);
    this.name = 'ApiError';
    this.type = type; // 'network' | 'server'
    this.status = status;
  }
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError('The service is unreachable.', 'network');
  }
  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.statusText}`, 'server', response.status);
  }
  return response.json();
}

function postJson(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const apiClient = {
  // Returns: { results[], confidence_signal, confidence_band, abstained, abstain_reason, retrieval_mode, ... }
  recommend(query, topK = 5, sourceLang = 'en') {
    return postJson('/recommend', { query, top_k: topK, source_lang: sourceLang });
  },

  // Exact-identifier workaround for a single standard — there is no
  // /standard/{id} endpoint. Returns the first result, or null if none.
  async getStandardByNumber(standardNumber) {
    const data = await apiClient.recommend(standardNumber, 1);
    return data.results?.[0] ?? null;
  },

  // Returns: { test_method[], safety[], terminology[], installation[], normative_reference[] }
  getAllied(standardNumber) {
    return request(`/allied/${encodeURIComponent(standardNumber)}`);
  },

  // Returns: { translated_text, source_lang, provider, cached, failed }
  translate(query, sourceLang = 'en') {
    return postJson('/translate', { query, source_lang: sourceLang });
  },

  // Returns: { clauses[], summary: { clauses_total, clauses_cited, missing_normative_refs_total, ... } }
  audit(specText) {
    return postJson('/audit', { spec_text: specText });
  },

  // Optional — resolves to null on any failure rather than throwing, so a
  // missing i18n endpoint never breaks the page.
  async getLanguages() {
    try {
      return await request('/i18n/languages');
    } catch {
      return null;
    }
  },

  async getI18n(lang = 'en') {
    try {
      return await request(`/i18n/${encodeURIComponent(lang)}`);
    } catch {
      return null;
    }
  },

  // Returns: { status, model_loaded, corpus_size, index_build_seconds }
  health() {
    return request('/health');
  },
};
