import './Badge.css';

const VARIANTS = ['success', 'warning', 'critical', 'info', 'neutral'];

// variant conveys colour; label text/icon must also carry the meaning
// (colour independence — see Phase 8).
export function Badge({ label, variant = 'neutral' }) {
  const safeVariant = VARIANTS.includes(variant) ? variant : 'neutral';
  return <span className={`badge badge-${safeVariant}`}>{label}</span>;
}
