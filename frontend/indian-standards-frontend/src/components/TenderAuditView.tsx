import React, { useState } from 'react';
import { AuditResult } from '../types/standards';
import { runTenderAudit } from '../services/audit';

/**
 * Minimal Tender Audit view: textarea + submit + clause-grouped results.
 * Deliberately unstyled beyond basic layout -- this is a functional
 * scaffold, not the final design. All behaviour (the fetch call, response
 * shaping) lives in services/audit.ts, not here, so a future restyle can
 * discard and rebuild this component without touching that logic.
 */
export const TenderAuditView: React.FC = () => {
  const [specText, setSpecText] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!specText.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const audit = await runTenderAudit(specText);
      setResult(audit);
    } catch (err: any) {
      setError(err.message || 'Failed to reach the audit service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 0' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Tender Specification Audit</h2>
      <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '1rem' }}>
        Paste a procurement specification below. Each clause is checked for cited IS standards,
        missing normative/test-method references, and edition mismatches against our records.
      </p>

      <textarea
        value={specText}
        onChange={(e) => setSpecText(e.target.value)}
        placeholder="Paste the tender specification text here..."
        rows={10}
        style={{
          width: '100%',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          padding: '0.75rem',
          border: '2px solid #ccc',
          borderRadius: '8px',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ marginTop: '0.75rem' }}>
        <button
          onClick={handleSubmit}
          disabled={isLoading || !specText.trim()}
          style={{
            padding: '0.6rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.875rem',
            borderRadius: '8px',
            border: 'none',
            background: isLoading ? '#999' : '#000',
            color: '#fff',
            cursor: isLoading ? 'default' : 'pointer',
          }}
        >
          {isLoading ? 'Auditing...' : 'Run Audit'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', border: '2px solid #c00', borderRadius: '8px', color: '#900', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1.5rem' }}>
          {/* Document summary */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
            <SummaryStat label="Clauses" value={result.summary.clauses_total} />
            <SummaryStat label="Cited" value={result.summary.clauses_cited} />
            <SummaryStat label="Uncited" value={result.summary.clauses_uncited} />
            <SummaryStat label="Missing refs" value={result.summary.missing_normative_refs_total} highlight />
            <SummaryStat label="Edition mismatches" value={result.summary.edition_mismatches_total} highlight />
          </div>

          {/* Per-clause findings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {result.clauses.map((finding, i) => (
              <div key={i} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>{finding.clause_text}</div>

                {finding.cited_standards.length > 0 && (
                  <div style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    <strong>Cited:</strong> {finding.cited_standards.join(', ')}
                  </div>
                )}

                {finding.abstained && (
                  <div style={{ fontSize: '0.8rem', color: '#856404', background: '#fff3cd', padding: '0.4rem 0.6rem', borderRadius: '6px', marginBottom: '0.35rem' }}>
                    No applicable standard found in corpus for this clause.
                    {finding.suggested_standards.length > 0 && (
                      <span> Closest matches (not confident recommendations): {finding.suggested_standards.map(s => s.standard_number).join(', ')}</span>
                    )}
                  </div>
                )}

                {!finding.abstained && !finding.cited_standards.length && finding.suggested_standards.length > 0 && (
                  <div style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    <strong>Suggested:</strong> {finding.suggested_standards.map(s => s.standard_number).join(', ')}
                  </div>
                )}

                {/* Missing normative references -- the highest-value output, called out prominently */}
                {finding.missing_normative_refs.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {finding.missing_normative_refs.map((ref, j) => (
                      <div
                        key={j}
                        style={{
                          fontSize: '0.8rem',
                          background: '#f8d7da',
                          color: '#721c24',
                          padding: '0.5rem 0.65rem',
                          borderRadius: '6px',
                          marginBottom: '0.3rem',
                        }}
                      >
                        {ref.missing_standard ? (
                          <>
                            <strong>Missing normative reference:</strong> {ref.cited_standard} cites no {ref.relationship_type?.replace('_', ' ')}
                            {' '}-- {ref.missing_standard} is required. {ref.note}
                          </>
                        ) : (
                          <>
                            <strong>{ref.cited_standard}:</strong> {ref.note}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Edition notes -- strictly "document cites X; our record shows Y", never "outdated" */}
                {finding.edition_notes.length > 0 && (
                  <div style={{ marginTop: '0.4rem' }}>
                    {finding.edition_notes.map((note, j) => (
                      <div key={j} style={{ fontSize: '0.8rem', background: '#d1ecf1', color: '#0c5460', padding: '0.4rem 0.6rem', borderRadius: '6px', marginBottom: '0.3rem' }}>
                        {note}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const SummaryStat: React.FC<{ label: string; value: number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div style={{ padding: '0.5rem 0.85rem', border: '1px solid #ddd', borderRadius: '8px', background: highlight && value > 0 ? '#fff3cd' : '#fafafa' }}>
    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{value}</div>
    <div style={{ color: '#666' }}>{label}</div>
  </div>
);
