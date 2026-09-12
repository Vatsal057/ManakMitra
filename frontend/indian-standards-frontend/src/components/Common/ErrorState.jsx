import './ErrorState.css';

// For genuine API failures only. Never renders substitute data.
export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="error-state" role="alert">
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <button type="button" className="error-state-retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
