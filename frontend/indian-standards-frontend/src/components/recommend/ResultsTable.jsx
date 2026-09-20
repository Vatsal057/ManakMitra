import { Tag } from '../Common/Tag';
import { InfoTooltip } from '../Common/InfoTooltip';
import { getMatchPercent } from '../../utils/matchScore';
import { useLanguage } from '../../context/LanguageContext';
import './ResultsTable.css';

function CertificationCell({ badge, t }) {
  const isNotDetermined = !badge || badge === 'Not determined';
  const label = isNotDetermined
    ? t('certification.Not determined', 'Not determined')
    : t(`certification.${badge}`, badge);

  return (
    <span className="cert-indicator">
      {isNotDetermined ? (
        <span className="cert-indicator-icon cert-indicator-neutral" aria-hidden="true">
          —
        </span>
      ) : (
        <span className="cert-indicator-icon cert-indicator-yes" aria-hidden="true">
          ✓
        </span>
      )}
      <span className="cert-indicator-text">{label}</span>
    </span>
  );
}

function MatchCell({ result, t }) {
  const percent = getMatchPercent(result);
  if (percent === null) {
    return <span className="match-cell-unavailable">{t('notAvailable', 'Not available')}</span>;
  }
  const variant = percent >= 70 ? 'success' : percent >= 50 ? 'warning' : 'critical';
  return (
    <span className="match-cell">
      <span className="visually-hidden">Match score {percent} percent</span>
      <span className="match-cell-percent" aria-hidden="true">
        {percent}%
      </span>
      <span className="match-cell-bar" aria-hidden="true">
        <span className={`match-cell-bar-fill match-cell-bar-${variant}`} style={{ width: `${percent}%` }} />
      </span>
    </span>
  );
}

export function ResultsTable({ results, onRowClick }) {
  const { t } = useLanguage();

  const handleKeyDown = (e, result) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(result);
    }
  };

  return (
    <table className="results-table" role="table">
      <thead>
        <tr role="row">
          <th role="columnheader">{t('standardsIdentified', 'Standard')}</th>
          <th role="columnheader">{t('mandatedSpecs', 'Title')}</th>
          <th role="columnheader">{t('categoryCol', 'Category')}</th>
          <th role="columnheader">
            <span className="results-table-th-with-tip">
              {t('allCertSchemes', 'Certification')}
              <InfoTooltip label="About the certification column">
                A green check means this standard has a known certification scheme (BIS Product Certification,
                CRS, or Hallmarking). "Not determined" means certification wasn't verified for this entry — not
                that it fails certification.
              </InfoTooltip>
            </span>
          </th>
          <th role="columnheader">{t('relevanceScoreLabel', 'Match')}</th>
          <th role="columnheader" aria-hidden="true" className="results-table-chevron-head"></th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {results.map((result) => (
          <tr
            key={result.standard_number}
            role="row"
            tabIndex={0}
            className="results-table-row"
            aria-label={`View details for ${result.standard_number}, ${result.title}`}
            onClick={() => onRowClick(result)}
            onKeyDown={(e) => handleKeyDown(e, result)}
          >
            <td role="cell" data-label="Standard" className="rt-cell-standard">
              {result.standard_number}
            </td>
            <td role="cell" data-label="Title" className="rt-cell-title" title={result.title}>
              {result.title}
            </td>
            <td role="cell" data-label="Category" className="rt-cell-category">
              {result.category && (
                <Tag label={t(`category.${result.category}`, result.category)} />
              )}
            </td>
            <td role="cell" data-label="Certification" className="rt-cell-cert">
              <CertificationCell badge={result.certification_badge} t={t} />
            </td>
            <td role="cell" data-label="Match" className="rt-cell-match">
              <MatchCell result={result} t={t} />
            </td>
            <td role="cell" aria-hidden="true" className="rt-cell-chevron">
              ›
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
