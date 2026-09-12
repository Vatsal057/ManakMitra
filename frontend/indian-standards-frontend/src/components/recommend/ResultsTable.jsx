import { Tag } from '../Common/Tag';
import { InfoTooltip } from '../Common/InfoTooltip';
import { getMatchPercent } from '../../utils/matchScore';
import './ResultsTable.css';

function CertificationCell({ badge }) {
  const isNotDetermined = !badge || badge === 'Not determined';
  return (
    // No aria-label here — aria-label is prohibited on a plain <span>
    // (implicit role "generic"), and the visible .cert-indicator-text below
    // already gives it an accessible name via content.
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
      <span className="cert-indicator-text">{isNotDetermined ? 'Not determined' : badge}</span>
    </span>
  );
}

function MatchCell({ result }) {
  const percent = getMatchPercent(result);
  if (percent === null) {
    return <span className="match-cell-unavailable">Not available</span>;
  }
  const variant = percent >= 70 ? 'success' : percent >= 50 ? 'warning' : 'critical';
  return (
    // aria-label is prohibited on a plain <span> (implicit role "generic")
    // — a visually-hidden text node gives it an accessible name instead.
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
          <th role="columnheader">Standard</th>
          <th role="columnheader">Title</th>
          <th role="columnheader">Category</th>
          <th role="columnheader">
            <span className="results-table-th-with-tip">
              Certification
              <InfoTooltip label="About the certification column">
                A green check means this standard has a known certification scheme (BIS Product Certification,
                CRS, or Hallmarking). "Not determined" means certification wasn't verified for this entry — not
                that it fails certification.
              </InfoTooltip>
            </span>
          </th>
          <th role="columnheader">Match</th>
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
              {result.category && <Tag label={result.category} />}
            </td>
            <td role="cell" data-label="Certification" className="rt-cell-cert">
              <CertificationCell badge={result.certification_badge} />
            </td>
            <td role="cell" data-label="Match" className="rt-cell-match">
              <MatchCell result={result} />
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
