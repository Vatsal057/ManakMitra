import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/Common/Badge';
import { Tag } from '../components/Common/Tag';
import { Spinner } from '../components/Common/Spinner';
import { EmptyState } from '../components/Common/EmptyState';
import { ErrorState } from '../components/Common/ErrorState';
import { VersionBlock } from '../components/detail/VersionBlock';
import { CertificationBlock } from '../components/detail/CertificationBlock';
import { AlliedStandards } from '../components/detail/AlliedStandards';
import { NearbyLabs } from '../components/detail/NearbyLabs';
import { AddToTenderModal } from '../components/tender/AddToTenderModal';
import { apiClient } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { decodeStandardSlug } from '../utils/standardSlug';
import './StandardDetailPage.css';

export function StandardDetailPage() {
  const { standardNumber: slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const decoded = decodeStandardSlug(slug);
  const passedStandard = location.state?.standard ?? null;

  const [fetchedStandard, setFetchedStandard] = useState(null);
  const [loading, setLoading] = useState(!passedStandard);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [modalStandard, setModalStandard] = useState(null);

  useEffect(() => {
    if (passedStandard) return; // fast path — nothing to fetch

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off the fetch this effect exists to run
    setLoading(true);
    setError(null);
    setNotFound(false);
    apiClient
      .getStandardByNumber(decoded)
      .then((result) => {
        if (cancelled) return;
        if (result) setFetchedStandard(result);
        else setNotFound(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [decoded, passedStandard, retryToken]);

  const standard = passedStandard ?? fetchedStandard;

  return (
    <div className="standard-detail-page">
      <button type="button" className="standard-detail-breadcrumb" onClick={() => navigate(-1)}>
        {t('backToResults', '← Back to results')}
      </button>

      {loading && <Spinner label={t('btnIdentifying', 'Loading standard…')} />}

      {error && (
        <ErrorState
          message={
            error.type === 'network'
              ? t('errorNetwork', 'The service is unreachable. Check your connection and try again.')
              : t('errorServer', 'Something went wrong on the server. Try again.')
          }
          onRetry={() => setRetryToken((n) => n + 1)}
        />
      )}

      {!loading && !error && notFound && (
        <EmptyState
          title={t('noMatchesTitle', 'Standard not found')}
          message={t('noMatchesDesc', "This standard number isn't in the corpus. Try searching instead.")}
          action={<Link to="/recommend">{t('tabStandards', 'Back to search')}</Link>}
        />
      )}

      {!loading && !error && standard && (
        <>
          <header className="standard-detail-header">
            <h1>{standard.standard_number}</h1>
            <p className="standard-detail-title">{standard.title}</p>
            <div className="standard-detail-badges">
              <Badge
                label={t(`certification.${standard.certification_badge}`, standard.certification_badge)}
                variant={standard.certification_badge === 'Not determined' ? 'neutral' : 'success'}
              />
              {standard.category && (
                <Tag label={t(`category.${standard.category}`, standard.category)} />
              )}
            </div>
            <button type="button" className="standard-detail-add" onClick={() => setModalStandard(standard)}>
              {t('exportSchedule', 'Add to tender')}
            </button>
          </header>

          <VersionBlock standard={standard} />

          {standard.scope_description && (
            <section className="standard-detail-scope">
              <h2>Scope</h2>
              <p>{standard.scope_description}</p>
            </section>
          )}

          <CertificationBlock standard={standard} />

          <AlliedStandards standardNumber={standard.standard_number} onAddToTender={setModalStandard} />

          <NearbyLabs standard={standard} />
        </>
      )}

      {modalStandard && (
        <AddToTenderModal standard={modalStandard} onClose={() => setModalStandard(null)} />
      )}
    </div>
  );
}
