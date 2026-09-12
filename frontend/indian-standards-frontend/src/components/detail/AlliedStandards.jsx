import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from '../Common/Tag';
import { Spinner } from '../Common/Spinner';
import { EmptyState } from '../Common/EmptyState';
import { ErrorState } from '../Common/ErrorState';
import { InfoTooltip } from '../Common/InfoTooltip';
import { apiClient } from '../../api/client';
import { encodeStandardSlug } from '../../utils/standardSlug';
import './AlliedStandards.css';

// Group keys and heading labels as returned by GET /allied/{standard_number}.
const GROUPS = [
  { key: 'normative_reference', heading: 'Normative references' },
  { key: 'test_method', heading: 'Test methods' },
  { key: 'safety', heading: 'Safety' },
  { key: 'terminology', heading: 'Terminology' },
  { key: 'installation', heading: 'Installation / application' },
];

export function AlliedStandards({ standardNumber, onAddToTender }) {
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiClient
      .getAllied(standardNumber)
      .then(setGroups)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off the fetch this effect exists to run
  useEffect(load, [standardNumber]);

  const totalCount = groups
    ? GROUPS.reduce((sum, g) => sum + (groups[g.key]?.length ?? 0), 0)
    : 0;

  return (
    <section className="allied-standards">
      <h2>Allied standards</h2>

      {loading && <Spinner label="Loading allied standards…" />}

      {error && (
        <ErrorState message="Couldn't load allied standards. Try again." onRetry={load} />
      )}

      {!loading && !error && groups && totalCount === 0 && (
        <EmptyState
          title="No allied standards mapped for this entry"
          message={
            <>
              This reflects current mapping coverage.
              <InfoTooltip label="What this means">
                This does not mean no related standards exist in reality —
                only that none are mapped in the corpus yet.
              </InfoTooltip>
            </>
          }
        />
      )}

      {!loading && !error && groups && totalCount > 0 && (
        <div className="allied-standards-groups">
          {GROUPS.filter((g) => groups[g.key]?.length).map((g) => (
            <div key={g.key} className="allied-standards-group">
              <h3>
                <Tag label={g.heading} relationshipType={g.key} />
              </h3>
              <ul>
                {groups[g.key].map((item) => (
                  <li key={item.standard_number} className="allied-standards-item">
                    <Link to={`/standard/${encodeStandardSlug(item.standard_number)}`}>
                      <span className="allied-standards-number">{item.standard_number}</span>{' '}
                      {item.title}
                    </Link>
                    {item.description && <p className="allied-standards-desc">{item.description}</p>}
                    <button type="button" onClick={() => onAddToTender(item)}>
                      Add to tender
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
