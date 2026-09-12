import { InfoTooltip } from '../Common/InfoTooltip';
import './VersionBlock.css';

function fact(label, value) {
  return (
    <div className="version-block-fact">
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );
}

export function VersionBlock({ standard }) {
  const mandatoryText =
    standard.mandatory === true ? 'Yes' : standard.mandatory === false ? 'No' : 'Not determined';

  return (
    <section className="version-block">
      <div className="version-block-heading">
        <h2>Version &amp; revision</h2>
        <InfoTooltip label="About version accuracy">
          This reflects a snapshot of the corpus, not a live query against
          BIS's current register. Verify the current status of this standard
          with BIS before finalising a tender.
        </InfoTooltip>
      </div>
      <dl className="version-block-facts">
        {fact('Year published', standard.year_published)}
        {fact('Latest version', standard.latest_version)}
        {fact('Amendments', standard.amendment_count ?? 'Not recorded')}
        {fact('Mandatory', mandatoryText)}
        {fact('QCO reference', standard.qco_reference)}
      </dl>
    </section>
  );
}
