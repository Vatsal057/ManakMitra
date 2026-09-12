import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuditInput } from '../components/audit/AuditInput';
import { AuditSummary } from '../components/audit/AuditSummary';
import { AuditClause } from '../components/audit/AuditClause';
import { AddToTenderModal } from '../components/tender/AddToTenderModal';
import { Spinner } from '../components/Common/Spinner';
import { ErrorState } from '../components/Common/ErrorState';
import { EmptyState } from '../components/Common/EmptyState';
import { useTender } from '../context/TenderContext';
import { useAudit } from '../context/AuditContext';
import { runAuditQuery, serializeTenderBuild } from '../utils/runAudit';
import './AuditPage.css';

export function AuditPage() {
  const location = useLocation();
  const { tender } = useTender();
  const { audit, setAuditResult, setAuditError, setAuditMode } = useAudit();
  const canAuditBuild = tender.items.some((item) => item.standards.length > 0);
  const buildPreview = serializeTenderBuild(tender);

  const [specText, setSpecText] = useState(audit.mode === 'paste' ? audit.specText : '');
  const [loading, setLoading] = useState(false);
  const [modalStandard, setModalStandard] = useState(null);

  const runAudit = async (mode, text) => {
    setLoading(true);
    await runAuditQuery({ mode, specText: text, setAuditResult, setAuditError });
    setLoading(false);
  };

  const handleRun = () => runAudit(audit.mode, audit.mode === 'build' ? buildPreview : specText);

  // One-click flow from the "Audit this build" action elsewhere — kicks off
  // the audit this effect exists to run, once, on arrival.
  useEffect(() => {
    if (location.state?.auditBuild && canAuditBuild) {
      setAuditMode('build');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      runAudit('build', buildPreview);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="audit-page">
      <h1>Tender Audit</h1>

      <AuditInput
        mode={audit.mode}
        onModeChange={setAuditMode}
        specText={specText}
        onSpecTextChange={setSpecText}
        buildPreview={buildPreview}
        canAuditBuild={canAuditBuild}
        onRun={handleRun}
        loading={loading}
      />

      {loading && <Spinner label="Auditing…" />}

      {!loading && audit.error && (
        <ErrorState
          message={
            audit.error.type === 'network'
              ? 'The service is unreachable. Check your connection and try again.'
              : 'Something went wrong on the server. Try again.'
          }
          onRetry={handleRun}
        />
      )}

      {!loading && !audit.error && audit.result && (
        <>
          {audit.result.summary.clauses_total === 0 ? (
            <EmptyState
              title="Nothing to audit"
              message="Paste or upload a spec, or add standards to your tender build first."
            />
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
        </>
      )}

      {modalStandard && (
        <AddToTenderModal standard={modalStandard} onClose={() => setModalStandard(null)} />
      )}
    </div>
  );
}
