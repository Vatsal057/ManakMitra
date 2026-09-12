import './AuditSummary.css';

export function AuditSummary({ summary }) {
  return (
    <div className="audit-summary">
      <div className="audit-stat">
        <span className="audit-stat-value">{summary.clauses_total}</span>
        <span className="audit-stat-label">Clauses</span>
      </div>
      <div className="audit-stat">
        <span className="audit-stat-value">{summary.clauses_cited}</span>
        <span className="audit-stat-label">Cite a standard</span>
      </div>
      <div className="audit-stat">
        <span className="audit-stat-value">{summary.clauses_uncited}</span>
        <span className="audit-stat-label">Don't cite a standard</span>
      </div>
      <div className={`audit-stat${summary.missing_normative_refs_total > 0 ? ' audit-stat-warning' : ''}`}>
        <span className="audit-stat-value">{summary.missing_normative_refs_total}</span>
        <span className="audit-stat-label">Missing normative references</span>
      </div>
      {summary.edition_mismatches_total > 0 && (
        <div className="audit-stat audit-stat-warning">
          <span className="audit-stat-value">{summary.edition_mismatches_total}</span>
          <span className="audit-stat-label">Edition mismatches</span>
        </div>
      )}
    </div>
  );
}
