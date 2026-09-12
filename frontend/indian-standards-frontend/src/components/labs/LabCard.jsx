import { Tag } from '../Common/Tag';
import { InfoTooltip } from '../Common/InfoTooltip';
import './LabCard.css';

export function LabCard({ lab }) {
  return (
    <article className="lab-card">
      <div className="lab-card-top">
        <Tag label={lab.state} />
        <Tag label={lab.primaryCategory} />
        <span className="lab-card-confidence">
          {lab.categoryConfidence} confidence
          <InfoTooltip label="About this speciality">
            Derived from the lab's name and address ({lab.classificationBasis}), not BIS's official
            accreditation records. Check the official BIS scope link below for authoritative coverage.
          </InfoTooltip>
        </span>
      </div>

      <h2 className="lab-card-name">{lab.name}</h2>

      <p className="lab-card-address">{lab.address}</p>

      <div className="lab-card-contact">
        {lab.contactPerson && <span>{lab.contactPerson}</span>}
        {lab.phone && <a href={`tel:${lab.phone.replace(/[^0-9+]/g, '')}`}>{lab.phone}</a>}
        {lab.email && <a href={`mailto:${lab.email}`}>{lab.email}</a>}
      </div>

      <div className="lab-card-meta">
        <span>Code: {lab.code}</span>
        <span>Valid: {lab.validity}</span>
      </div>

      <a className="lab-card-scope" href={lab.scopeUrl} target="_blank" rel="noopener noreferrer">
        Official BIS testing scope ↗
      </a>
    </article>
  );
}
