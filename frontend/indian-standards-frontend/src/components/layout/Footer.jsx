import { InfoTooltip } from '../Common/InfoTooltip';
import './Footer.css';

export function Footer() {
  return (
    <footer className="app-footer">
      <p>
        Curated subset of Indian Standards, not the complete published universe.
        <InfoTooltip label="More about corpus coverage">
          This tool searches a curated subset of Indian Standards, not BIS's
          complete published catalogue. A standard not appearing here may
          still exist and apply to your procurement.
        </InfoTooltip>
      </p>
      <p>
        Version/amendment info is not live-verified against BIS — confirm before finalising a tender.
        <InfoTooltip label="More about version accuracy">
          Version and amendment details reflect a snapshot of the corpus at
          the time it was built, not a live query against BIS's current
          register. Always verify the current status of a standard with BIS
          before finalising a tender.
        </InfoTooltip>
      </p>
    </footer>
  );
}
