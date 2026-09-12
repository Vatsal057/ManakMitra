import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Common/Badge';
import { Tag } from '../components/Common/Tag';
import { EmptyState } from '../components/Common/EmptyState';
import { InfoTooltip } from '../components/Common/InfoTooltip';
import { ErrorState } from '../components/Common/ErrorState';
import { Spinner } from '../components/Common/Spinner';
import { AuditSummary } from '../components/audit/AuditSummary';
import { AuditClause } from '../components/audit/AuditClause';
import { AddToTenderModal } from '../components/tender/AddToTenderModal';
import { useTender } from '../context/TenderContext';
import { useAudit } from '../context/AuditContext';
import { findItemContaining } from '../utils/tenderStandard';
import { runAuditQuery, serializeTenderBuild } from '../utils/runAudit';
import './TenderBuilderPage.css';

function ProvenanceNote({ standard }) {
  if (standard.provenance === 'allied') {
    return (
      <span className="tender-row-provenance">
        Auto-added via {standard.sourceStandardNumber}
        {standard.relationshipType && <Tag label={standard.relationshipType} relationshipType={standard.relationshipType} />}
      </span>
    );
  }
  return <span className="tender-row-provenance">Added directly</span>;
}

export function TenderBuilderPage() {
  const { tender, dispatch, totalCount } = useTender();
  const { audit, setAuditResult, setAuditError, setAuditMode } = useAudit();
  const [exporting, setExporting] = useState(null); // 'docx' | 'csv' | null
  const [exportError, setExportError] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [modalStandard, setModalStandard] = useState(null);

  const unverifiedCount = tender.items.reduce(
    (sum, item) => sum + item.standards.filter((s) => s.certificationBadge === 'Not determined').length,
    0
  );

  const handleClearAll = () => {
    if (totalCount === 0) return;
    if (window.confirm('Clear the entire tender build? This cannot be undone.')) {
      dispatch({ type: 'CLEAR_ALL' });
    }
  };

  // Dynamic import — the docx library is the largest dependency in the app
  // and most visits never touch /tender, let alone export, so it's not
  // worth shipping in the main bundle.
  const handleExportDocx = async () => {
    setExporting('docx');
    setExportError(null);
    try {
      const { exportTenderToDocx } = await import('../utils/tenderExport');
      await exportTenderToDocx(tender);
    } catch {
      setExportError('Could not generate the DOCX file. Try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportCsv = async () => {
    setExporting('csv');
    setExportError(null);
    try {
      const { exportTenderToCsv } = await import('../utils/tenderExport');
      exportTenderToCsv(tender);
    } catch {
      setExportError('Could not generate the CSV file. Try again.');
    } finally {
      setExporting(null);
    }
  };

  // Renders inline below the build (option A from the revision spec) so the
  // user never loses the build or the export actions by navigating to a
  // separate /audit page. Held in AuditContext, so it also survives leaving
  // /tender and coming back within the session.
  const handleAuditBuild = async () => {
    setAuditing(true);
    setAuditMode('build');
    await runAuditQuery({
      mode: 'build',
      specText: serializeTenderBuild(tender),
      setAuditResult,
      setAuditError,
    });
    setAuditing(false);
  };

  const showAuditPanel = audit.mode === 'build' && audit.hasRun;

  if (tender.items.length === 0) {
    return (
      <div className="tender-page">
        <h1>Tender Builder</h1>
        <EmptyState
          title="Nothing built yet"
          message="Search for standards and add them to a tender item to get started."
          action={<Link to="/recommend">Go to Recommend</Link>}
        />
      </div>
    );
  }

  return (
    <div className="tender-page">
      <h1>Tender Builder</h1>

      <div className="tender-summary" role="status" aria-live="polite">
        <span>{tender.items.length} item{tender.items.length === 1 ? '' : 's'}</span>
        <span>{totalCount} standard{totalCount === 1 ? '' : 's'}</span>
        {unverifiedCount > 0 && (
          <span className="tender-summary-warning">
            {unverifiedCount} with unverified certification
            <InfoTooltip label="About unverified certification">
              These standards show "Not determined" for certification — confirm the correct certification
              requirement with BIS before the tender is issued.
            </InfoTooltip>
          </span>
        )}
        <button type="button" className="tender-clear" onClick={handleClearAll}>
          Clear build
        </button>
      </div>

      {tender.items.map((item) => (
        <section key={item.id} className="tender-item">
          <div className="tender-item-head">
            <input
              type="text"
              value={item.name}
              aria-label="Item name"
              onChange={(e) => dispatch({ type: 'RENAME_ITEM', itemId: item.id, name: e.target.value })}
            />
            <span className="tender-item-count">
              {item.standards.length} standard{item.standards.length === 1 ? '' : 's'}
            </span>
            <button type="button" onClick={() => dispatch({ type: 'DELETE_ITEM', itemId: item.id })}>
              Delete item
            </button>
          </div>

          {item.standards.length === 0 ? (
            <EmptyState message="No standards in this item yet." />
          ) : (
            <ul className="tender-item-standards">
              {item.standards.map((s) => {
                const elsewhere = findItemContaining(tender, s.standardNumber, item.id);
                const otherItems = tender.items.filter((i) => i.id !== item.id);
                return (
                  <li key={s.standardNumber} className="tender-row">
                    <div className="tender-row-main">
                      <span className="tender-row-number">{s.standardNumber}</span>
                      <span className="tender-row-title">{s.title}</span>
                      {s.certificationBadge && (
                        <span className="tender-row-cert">
                          <Badge
                            label={s.certificationBadge}
                            variant={s.certificationBadge === 'Not determined' ? 'neutral' : 'success'}
                          />
                          {s.certificationBadge === 'Not determined' && (
                            <InfoTooltip label="Unverified certification">
                              Certification status was not verified for this entry — confirm with BIS before
                              the tender is issued.
                            </InfoTooltip>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="tender-row-meta">
                      <ProvenanceNote standard={s} />
                      {elsewhere && <span className="tender-row-elsewhere">Also in "{elsewhere.name}"</span>}
                    </div>

                    <div className="tender-row-actions">
                      {otherItems.length > 0 && (
                        <select
                          aria-label={`Move ${s.standardNumber} to another item`}
                          defaultValue=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            dispatch({
                              type: 'MOVE_STANDARD',
                              fromItemId: item.id,
                              toItemId: e.target.value,
                              standardNumber: s.standardNumber,
                            });
                          }}
                        >
                          <option value="">Move to…</option>
                          {otherItems.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({ type: 'REMOVE_STANDARD', itemId: item.id, standardNumber: s.standardNumber })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      <div className="tender-forward-actions">
        <button type="button" onClick={handleAuditBuild} disabled={auditing}>
          {auditing ? 'Auditing…' : 'Audit this build'}
        </button>
        <button
          type="button"
          onClick={handleExportDocx}
          disabled={totalCount === 0 || exporting !== null}
          title={totalCount === 0 ? 'Add standards to your tender build first' : undefined}
        >
          {exporting === 'docx' ? 'Exporting…' : 'Export DOCX'}
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={totalCount === 0 || exporting !== null}
          title={totalCount === 0 ? 'Add standards to your tender build first' : undefined}
        >
          {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
      {exportError && <p className="tender-export-error">{exportError}</p>}

      {auditing && <Spinner label="Auditing…" />}

      {!auditing && showAuditPanel && (
        <section className="tender-audit-panel">
          <h2>Audit results</h2>

          {audit.error ? (
            <ErrorState
              message={
                audit.error.type === 'network'
                  ? 'The service is unreachable. Check your connection and try again.'
                  : 'Something went wrong on the server. Try again.'
              }
              onRetry={handleAuditBuild}
            />
          ) : audit.result.summary.clauses_total === 0 ? (
            <EmptyState title="Nothing to audit" message="Add standards to your tender build first." />
          ) : (
            <>
              <AuditSummary summary={audit.result.summary} />
              {audit.result.summary.missing_normative_refs_total === 0 && (
                <EmptyState
                  title="No missing normative references found"
                  message="This checks reference coverage, not technical compliance — it isn't a guarantee the spec is complete or correct."
                />
              )}
              <ul className="audit-clause-list">
                {audit.result.clauses.map((clause, i) => (
                  <AuditClause key={i} clause={clause} onAddToTender={setModalStandard} />
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {modalStandard && (
        <AddToTenderModal standard={modalStandard} onClose={() => setModalStandard(null)} />
      )}
    </div>
  );
}
