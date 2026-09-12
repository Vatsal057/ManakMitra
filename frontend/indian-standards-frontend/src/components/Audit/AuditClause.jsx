import { Banner } from '../Common/Banner';
import { Tag } from '../Common/Tag';
import { StandardChip } from './StandardChip';
import './AuditClause.css';

export function AuditClause({ clause, onAddToTender }) {
  const hasMissing = clause.missing_normative_refs?.length > 0;
  const hasSuggestions = clause.suggested_standards?.length > 0;

  return (
    <li className={`audit-clause${hasMissing ? ' audit-clause-flagged' : ''}`}>
      <p className="audit-clause-text">{clause.clause_text}</p>

      {clause.cited_standards.length > 0 ? (
        <div className="audit-clause-chips">
          <span className="audit-clause-label">Cites:</span>
          {clause.cited_standards.map((num) => (
            <StandardChip key={num} standardNumber={num} onAddToTender={onAddToTender} />
          ))}
        </div>
      ) : (
        <p className="audit-clause-uncited">No standard cited in this clause.</p>
      )}

      {hasMissing && (
        <Banner variant="warning" title={`${clause.missing_normative_refs.length} missing normative reference(s)`}>
          <ul className="audit-clause-missing-list">
            {clause.missing_normative_refs.map((m, i) => (
              <li key={i}>
                {m.missing_standard ? (
                  <>
                    <StandardChip standardNumber={m.missing_standard} onAddToTender={onAddToTender} />
                    {m.relationship_type && <Tag label={m.relationship_type} relationshipType={m.relationship_type} />}
                  </>
                ) : (
                  // The API can report a check with no specific standard to
                  // recommend (missing_standard/relationship_type both
                  // null) — show the checked citation instead of a broken
                  // link/action.
                  <span className="audit-clause-missing-checked">{m.cited_standard}</span>
                )}
                <span className="audit-clause-missing-note">{m.note}</span>
              </li>
            ))}
          </ul>
        </Banner>
      )}

      {hasSuggestions && (
        <details className="audit-clause-suggestions">
          <summary>Possible standards for this clause (not cited)</summary>
          <div className="audit-clause-chips">
            {clause.suggested_standards.slice(0, 3).map((s) => (
              <StandardChip key={s.standard_number} standardNumber={s.standard_number} standard={s} onAddToTender={onAddToTender} />
            ))}
          </div>
        </details>
      )}
    </li>
  );
}
