import { useNavigate } from 'react-router-dom';
import { SearchPanel } from '../components/recommend/SearchPanel';
import { ResultsSummaryBar } from '../components/recommend/ResultsSummaryBar';
import { ResultsTable } from '../components/recommend/ResultsTable';
import { WeakerMatches } from '../components/recommend/WeakerMatches';
import { LandingContent } from '../components/recommend/LandingContent';
import { Banner } from '../components/Common/Banner';
import { EmptyState } from '../components/Common/EmptyState';
import { ErrorState } from '../components/Common/ErrorState';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import { encodeStandardSlug } from '../utils/standardSlug';
import { getMatchPercent, MATCH_THRESHOLD } from '../utils/matchScore';
import './RecommendPage.css';

export function RecommendPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { search, runSearch } = useSearch();

  const loading = search.loading;

  const handleSearch = (query, topK) => runSearch(query, topK, language);

  const handleRetry = () => {
    if (search.query) runSearch(search.query, 20, language);
  };

  const handleViewDetails = (result) => {
    navigate(`/standard/${encodeStandardSlug(result.standard_number)}`, { state: { standard: result } });
  };

  const { results, error } = search;
  const mainResults = results.filter((r) => {
    const pct = getMatchPercent(r);
    return pct !== null && pct >= MATCH_THRESHOLD;
  });
  const weakerResults = results.filter((r) => !mainResults.includes(r));
  const noStrongMatches = search.hasSearched && !search.abstained && results.length > 0 && mainResults.length === 0;

  return (
    <div className="recommend-page">
      <h1 className="recommend-page-title">Specification Search</h1>
      <p className="recommend-page-subtitle">
        Enter a tender specification, GeM product description, or engineering parameters to identify applicable
        Indian Standards.
      </p>

      <SearchPanel onSearch={handleSearch} loading={loading} initialQuery={search.query} />

      <p className="visually-hidden" role="status" aria-live="polite">
        {!loading && search.hasSearched && !error && !search.abstained &&
          `${mainResults.length} result${mainResults.length === 1 ? '' : 's'} above ${MATCH_THRESHOLD}% match.`}
        {!loading && search.hasSearched && !error && search.abstained &&
          `Outside the corpus's scope. ${results.length} near-miss result${results.length === 1 ? '' : 's'} shown.`}
      </p>

      {error && (
        <ErrorState
          message={
            error.type === 'network'
              ? 'The service is unreachable. Check your connection and try again.'
              : 'Something went wrong on the server. Try again.'
          }
          onRetry={handleRetry}
        />
      )}

      {!error && search.hasSearched && (
        <>
          {search.abstained && (
            <Banner variant="warning" title="Outside the corpus's scope">
              <p>{search.abstainReason ?? 'The query did not match any standard with sufficient confidence.'}</p>
              <p>This is deliberate caution, not a failure — the near-misses below are shown so you can judge for yourself.</p>
            </Banner>
          )}

          {results.length === 0 ? (
            <EmptyState
              title="No standards found"
              message="Try adding detail about material, dimensions, or intended use."
            />
          ) : (
            <>
              {!search.abstained && (
                <ResultsSummaryBar mainCount={mainResults.length} retrievalMode={search.retrievalMode} />
              )}

              {noStrongMatches && (
                <Banner variant="info" title="No strong matches found">
                  These are the closest available — try adding detail about material, dimensions, or intended
                  use for a stronger match.
                </Banner>
              )}

              {mainResults.length > 0 && (
                <ResultsTable results={mainResults} onRowClick={handleViewDetails} />
              )}

              <WeakerMatches
                key={search.query}
                results={weakerResults}
                onRowClick={handleViewDetails}
                defaultExpanded={search.abstained || mainResults.length === 0}
              />
            </>
          )}
        </>
      )}

      {!search.hasSearched && !loading && <LandingContent />}
    </div>
  );
}
