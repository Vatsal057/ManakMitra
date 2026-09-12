import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div>
      <h1>Page not found</h1>
      <p>
        <Link to="/recommend">Back to Recommend</Link>
      </p>
    </div>
  );
}
