import { Badge } from '../Common/Badge';
import { InfoTooltip } from '../Common/InfoTooltip';
import { RETRIEVAL_MODE_LABELS } from '../../utils/confidence';
import { MATCH_THRESHOLD } from '../../utils/matchScore';
import './ResultsSummaryBar.css';

// Replaces the old confidence-band strip: confidence_band is no longer
// shown anywhere in the results UI (see item 14) — this bar is just the
// result count, why-these-results-ranked tag, and what "Match" measures.
export function ResultsSummaryBar({ mainCount, retrievalMode }) {
  return (
    <div className="results-summary-bar">
      <span className="results-summary-count">
        {mainCount} standard{mainCount === 1 ? '' : 's'} above {MATCH_THRESHOLD}% match
      </span>

      {retrievalMode && (
        <>
          <Badge label={RETRIEVAL_MODE_LABELS[retrievalMode] ?? retrievalMode} variant="neutral" />
          <InfoTooltip label="What does this match type mean?">
            Indicates why these results ranked: an exact identifier match, a hybrid of keyword and semantic
            search, or a purely semantic (dense) match.
          </InfoTooltip>
        </>
      )}

      <InfoTooltip label="What does the match score mean?">
        A retrieval similarity measure indicating how closely the standard's indexed text matches your query —
        not a judgement of whether the standard is legally correct for your procurement.
      </InfoTooltip>
    </div>
  );
}
