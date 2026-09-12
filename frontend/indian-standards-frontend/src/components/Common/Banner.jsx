import './Banner.css';

const VARIANTS = ['info', 'warning', 'critical'];

// On-screen caveats/abstention/errors — a deliberate design element, not
// fine print. Colour is never the only cue: each variant also gets an icon.
const ICONS = { info: 'ℹ', warning: '▲', critical: '✕' };

export function Banner({ variant = 'info', title, children }) {
  const safeVariant = VARIANTS.includes(variant) ? variant : 'info';
  return (
    <div className={`banner banner-${safeVariant}`} role="status">
      <span className="banner-icon" aria-hidden="true">{ICONS[safeVariant]}</span>
      <div className="banner-body">
        {title && <p className="banner-title">{title}</p>}
        {children && <div className="banner-content">{children}</div>}
      </div>
    </div>
  );
}
