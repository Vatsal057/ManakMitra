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
  const { language, t } = useLanguage();
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

  const hasTranslation =
    Boolean(search.translatedQuery) &&
    search.translatedQuery.trim().toLowerCase() !== (search.query || '').trim().toLowerCase();

  return (
    <div className="recommend-page">
      <div className="recommend-page-hero">
        <h1 className="recommend-page-title">{t('inputTitle', 'Specification Search')}</h1>
        <p className="recommend-page-tagline">
          Your Standards Companion for Public Procurement
        </p>
      </div>

      <SearchPanel onSearch={handleSearch} loading={loading} initialQuery={search.query} />

      <p className="visually-hidden" role="status" aria-live="polite">
        {!loading && search.hasSearched && !error && !search.abstained &&
          `${mainResults.length} ${t('resultsFound', 'results found')}`}
        {!loading && search.hasSearched && !error && search.abstained &&
          `${t('noMatchesTitle', "Outside the corpus's scope")}. ${results.length} near-miss ${t('resultsFound', 'results found')}.`}
      </p>

      {error && (
        <ErrorState
          message={
            error.type === 'network'
              ? t('errorNetwork', 'The service is unreachable. Check your connection and try again.')
              : t('errorServer', 'Something went wrong on the server. Try again.')
          }
          onRetry={handleRetry}
        />
      )}

      {!error && search.hasSearched && (
        <>
          {hasTranslation && (
            <Banner variant="info" title={t('multilingualNoticeTitle', 'Multilingual Input Active:')}>
              <p>{t('multilingualNoticeText', 'Technical specification translated from Indic language to standard engineering English for semantic matching.')}</p>
              <p style={{ marginTop: 'var(--space-4)', wordBreak: 'break-word' }}>
                <strong>{t('translatedQueryHeader', 'Translated specification (English query engine):')}</strong>{' '}
                <em>"{search.translatedQuery}"</em>
              </p>
            </Banner>
          )}

          {search.abstained && (
            <Banner variant="warning" title={t('noMatchesTitle', "Outside the corpus's scope")}>
              <p>{search.abstainReason ?? t('noMatchesDesc', 'The query did not match any standard with sufficient confidence.')}</p>
              <p>{t('abstainCautionNote', 'This is deliberate caution, not a failure — the near-misses below are shown so you can judge for yourself.')}</p>
            </Banner>
          )}

          {results.length === 0 ? (
            <EmptyState
              title={t('noMatchesTitle', 'No standards found')}
              message={t('noMatchesDesc', 'Try adding detail about material, dimensions, or intended use.')}
            />
          ) : (
            <>
              {!search.abstained && (
                <ResultsSummaryBar mainCount={mainResults.length} retrievalMode={search.retrievalMode} />
              )}

              {noStrongMatches && (
                <Banner variant="info" title={t('suppMatch', 'No strong matches found')}>
                  {t('noMatchesDesc', 'These are the closest available — try adding detail about material, dimensions, or intended use for a stronger match.')}
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
