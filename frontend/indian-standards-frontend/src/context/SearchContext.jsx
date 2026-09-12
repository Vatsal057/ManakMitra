import { createContext, useContext, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

// Search state lifted above the router so leaving /recommend (a detail page,
// the nav, anywhere) and coming back restores the previous results exactly
// — no refetch on mount, no clearing on unmount. Session-only, like the
// tender build: in-memory, never persisted to storage.
//
// runSearch lives here (not in RecommendPage) so there is exactly one code
// path that calls /recommend and writes results — the main search page's
// submit handler and the navbar quick-search's keyword-fallback both call
// this same function. That's deliberate: the earlier design had a second,
// page-local runSearch triggered by a location.state flag on mount, which
// silently no-op'd when navigating to /recommend from /recommend itself
// (no remount = the mount effect never re-ran) and otherwise left a stale
// runQuery flag sitting in that history entry's state, ready to re-fire and
// clobber good results the moment "Back" ever landed on it again.
const SearchContext = createContext(null);

const EMPTY = {
  query: '',
  language: 'en',
  results: [],
  confidenceBand: null,
  abstained: false,
  abstainReason: null,
  retrievalMode: null,
  error: null,
  hasSearched: false,
  loading: false,
};

export function SearchProvider({ children }) {
  const [search, setSearch] = useState(EMPTY);

  const runSearch = async (query, topK, language) => {
    setSearch((prev) => ({ ...prev, loading: true }));
    try {
      const response = await apiClient.recommend(query, topK, language);
      setSearch({
        query,
        language,
        results: response.results ?? [],
        confidenceBand: response.confidence_band ?? null,
        abstained: Boolean(response.abstained),
        abstainReason: response.abstain_reason ?? null,
        retrievalMode: response.results?.[0]?.retrieval_mode ?? null,
        error: null,
        hasSearched: true,
        loading: false,
      });
    } catch (err) {
      setSearch({ ...EMPTY, query, language, error: err, hasSearched: true, loading: false });
    }
  };

  const value = useMemo(() => ({ search, runSearch }), [search]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within a SearchProvider');
  return ctx;
}
