import { useState } from 'react';
import './AttributionBanner.css';

const STORAGE_KEY = 'manakmitra-attribution-dismissed';

// Read synchronously in the lazy useState initializer (not in an effect) so
// a returning visitor never sees a flash of the banner before it disappears
// — it simply never renders in the first place.
function getInitiallyDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function AttributionBanner() {
  const [dismissed, setDismissed] = useState(getInitiallyDismissed);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Non-fatal — it just won't stay dismissed on reload in this tab.
    }
  };

  return (
    <div className="attribution-banner" role="status">
      <p>Built by students of Ramaiah University of Applied Sciences for SIH 2026.</p>
      <button type="button" className="attribution-banner-dismiss" aria-label="Dismiss" onClick={handleDismiss}>
        ×
      </button>
    </div>
  );
}
