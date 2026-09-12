import { useState } from 'react';
import { ResultsTable } from './ResultsTable';
import './WeakerMatches.css';

// Below-threshold results are disclosed, not discarded — hiding them
// outright would contradict the abstention design, where near-misses are
// deliberately shown so the user can judge for themselves.
//
// defaultExpanded only matters as this component's *initial* state for a
// given search — the parent remounts it (via a `key` tied to the search)
// each time a new search lands, so a fresh default applies without fighting
// the user's own manual toggle mid-search.
export function WeakerMatches({ results, onRowClick, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (results.length === 0) return null;

  return (
    <div className="weaker-matches">
      <button
        type="button"
        className="weaker-matches-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={`weaker-matches-chevron ${expanded ? 'open' : ''}`} aria-hidden="true">
          ›
        </span>
        Weaker matches ({results.length})
      </button>
      {expanded && <ResultsTable results={results} onRowClick={onRowClick} />}
    </div>
  );
}
