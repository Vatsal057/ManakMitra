import './EmptyState.css';

// A deliberate design, not an error — used for "no results", "no allied
// standards", "nothing added yet", etc.
export function EmptyState({ icon = '—', title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      {title && <p className="empty-state-title">{title}</p>}
      {message && <p className="empty-state-message">{message}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
