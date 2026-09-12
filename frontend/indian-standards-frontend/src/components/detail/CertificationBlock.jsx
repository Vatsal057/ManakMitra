import { Badge } from '../Common/Badge';
import { InfoTooltip } from '../Common/InfoTooltip';
import './CertificationBlock.css';

const CERTIFICATION_SOURCE_LABELS = {
  not_assessed: 'Not assessed against this entry',
  public_knowledge: 'Based on publicly available certification records',
};

export function CertificationBlock({ standard }) {
  const isNotDetermined = standard.certification_badge === 'Not determined';
  const sourceLabel = CERTIFICATION_SOURCE_LABELS[standard.certification_source] ?? standard.certification_source;

  return (
    <section className="certification-block">
      <div className="certification-block-heading">
        <h2>Certification</h2>
        <InfoTooltip label="About BIS, CRS, and Hallmarking">
          BIS Product Certification, the Compulsory Registration Scheme
          (CRS, for electronics), and Hallmarking (for jewellery purity) are
          separate certification schemes — a standard may fall under one,
          several, or none of them.
        </InfoTooltip>
      </div>

      <Badge label={standard.certification_badge} variant={isNotDetermined ? 'neutral' : 'success'} />

      <p className="certification-block-note">
        {isNotDetermined
          ? 'Certification status was not verified for this entry. This does not mean certification is not required — verify with BIS before finalising a tender.'
          : 'Certification was verified for this entry against available records.'}
      </p>

      {sourceLabel && <p className="certification-block-source">Basis: {sourceLabel}</p>}
    </section>
  );
}
