import { InfoTooltip } from '../Common/InfoTooltip';
import './AuditInput.css';

export function AuditInput({
  mode,
  onModeChange,
  specText,
  onSpecTextChange,
  buildPreview,
  canAuditBuild,
  onRun,
  loading,
}) {
  const activeText = mode === 'build' ? buildPreview : specText;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onSpecTextChange(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  return (
    <div className="audit-input">
      <div className="audit-input-tabs">
        <button
          type="button"
          className={mode === 'paste' ? 'active' : ''}
          onClick={() => onModeChange('paste')}
        >
          Paste or upload a spec
        </button>
        <button
          type="button"
          className={mode === 'build' ? 'active' : ''}
          onClick={() => onModeChange('build')}
          disabled={!canAuditBuild}
          title={canAuditBuild ? undefined : 'Add standards to your tender build first'}
        >
          Audit my current build
        </button>
      </div>

      {mode === 'paste' ? (
        <>
          <textarea
            rows={10}
            value={specText}
            onChange={(e) => onSpecTextChange(e.target.value)}
            placeholder="Paste tender specification text here…"
          />
          <label className="audit-input-upload">
            Or upload a .txt file
            <input type="file" accept=".txt,text/plain" onChange={handleFile} />
          </label>
        </>
      ) : (
        <textarea
          rows={10}
          value={buildPreview}
          readOnly
          aria-label="Serialised tender build"
          className="audit-input-preview"
        />
      )}

      <div className="audit-input-actions">
        <button type="button" className="audit-input-run" onClick={onRun} disabled={loading || !activeText.trim()}>
          {loading ? 'Auditing…' : 'Run audit'}
        </button>
        <p className="audit-input-caveat">
          Checks whether clauses reference appropriate standards — it does not verify that a clause's
          technical content actually complies with them.
          <InfoTooltip label="More about audit scope">
            The audit looks for missing normative references and version issues in what a clause
            <em> cites</em>. It cannot check dimensions, tolerances, materials, or other technical
            content against the cited standard — read the results as informed guidance, not a
            compliance guarantee.
          </InfoTooltip>
        </p>
      </div>
    </div>
  );
}
