import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../Common/EmptyState';
import { InfoTooltip } from '../Common/InfoTooltip';
import { ALL_BIS_LABS, listStates, filterByState } from '../../data/bisLabsData';
import { getLabCategoriesForStandardCategory } from '../../data/standardCategoryToLabCategory';
import './NearbyLabs.css';

const states = listStates().map((s) => s.state);
const RESULT_LIMIT = 8;

// Best-effort match between a reverse-geocoded state name (from Nominatim,
// which doesn't necessarily spell Indian states the same way BIS does) and
// our dataset's state list.
function matchState(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  const exact = states.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;
  return states.find((s) => lower.includes(s.toLowerCase()) || s.toLowerCase().includes(lower)) ?? null;
}

async function reverseGeocode(lat, lon) {
  // Nominatim is keyless; the browser's own Referer header identifies the
  // request per its usage policy — fetch() cannot set a custom User-Agent.
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
  );
  if (!res.ok) throw new Error('reverse geocode failed');
  return res.json();
}

function rankByCity(labs, cityInput) {
  const q = cityInput.trim().toLowerCase();
  if (!q) return labs;
  return [...labs].sort((a, b) => Number(b.city.toLowerCase() === q) - Number(a.city.toLowerCase() === q));
}

export function NearbyLabs({ standard }) {
  const [stateChoice, setStateChoice] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [locating, setLocating] = useState(false);

  const handleUseLocation = () => {
    if (!navigator.geolocation) return; // unsupported — stay on manual entry, no error noise
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const data = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          const addr = data.address ?? {};
          const matched = matchState(addr.state);
          if (matched) setStateChoice(matched);
          setCityInput(addr.city ?? addr.town ?? addr.village ?? '');
        } catch {
          // Silent — geolocation resolved but reverse geocoding failed; the
          // user can still pick a state manually.
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false), // permission denied / unavailable — silent fallback
      { timeout: 8000 }
    );
  };

  // "Uncategorized" is the API's own way of saying "no real category" — the
  // same as the field being absent, not a category we could ever map.
  const rawCategory = standard?.category?.trim();
  const hasCategory = Boolean(rawCategory) && rawCategory.toLowerCase() !== 'uncategorized';
  const mappedLabCategories = hasCategory ? getLabCategoriesForStandardCategory(rawCategory) : null;
  // Category is present but nothing in the labs dataset's vocabulary is a
  // confident match for it (see standardCategoryToLabCategory.js) — this is
  // NOT the same as having no category at all, and it never falls back to
  // showing unrelated labs.
  const categoryUnmapped = hasCategory && !mappedLabCategories;

  const { primaryMatches, secondaryMatches } = useMemo(() => {
    if (!mappedLabCategories) return { primaryMatches: [], secondaryMatches: [] };
    const primary = [];
    const secondary = [];
    for (const lab of ALL_BIS_LABS) {
      if (mappedLabCategories.includes(lab.primaryCategory)) {
        primary.push(lab);
      } else if (lab.secondaryCategories.some((c) => mappedLabCategories.includes(c))) {
        secondary.push(lab);
      }
    }
    return { primaryMatches: primary, secondaryMatches: secondary };
  }, [mappedLabCategories]);

  const results = useMemo(() => {
    if (!stateChoice) return [];

    if (mappedLabCategories) {
      const primaryInState = rankByCity(filterByState(primaryMatches, stateChoice), cityInput);
      const secondaryInState = rankByCity(filterByState(secondaryMatches, stateChoice), cityInput);
      return [
        ...primaryInState.map((lab) => ({ lab, matchType: 'primary' })),
        ...secondaryInState.map((lab) => ({ lab, matchType: 'secondary' })),
      ].slice(0, RESULT_LIMIT);
    }

    if (categoryUnmapped) return [];

    // No category on record at all — the previous location-only behavior.
    return rankByCity(filterByState(ALL_BIS_LABS, stateChoice), cityInput)
      .slice(0, RESULT_LIMIT)
      .map((lab) => ({ lab, matchType: 'location-only' }));
  }, [stateChoice, cityInput, mappedLabCategories, categoryUnmapped, primaryMatches, secondaryMatches]);

  return (
    <section className="nearby-labs">
      <div className="nearby-labs-heading">
        <h2>Nearby testing labs</h2>
        <InfoTooltip label="About this section">
          {mappedLabCategories ? (
            <>
              These are labs whose <strong>likely</strong> speciality matches this standard&rsquo;s category
              (&ldquo;{rawCategory}&rdquo;) — not a confirmed capability match. Both the lab&rsquo;s speciality
              and the standard&rsquo;s category are derived classifications, not sourced from official BIS
              accreditation scope. Verify against the lab&rsquo;s official BIS scope link before relying on
              this. The labs dataset also has no coordinates, so &ldquo;nearby&rdquo; means &ldquo;in your
              state,&rdquo; not &ldquo;closest.&rdquo;
            </>
          ) : (
            <>
              The labs dataset has no coordinates, so results are grouped by state, not sorted by distance —
              &ldquo;nearby&rdquo; here means &ldquo;in your state,&rdquo; not &ldquo;closest.&rdquo;
            </>
          )}
        </InfoTooltip>
      </div>

      {!hasCategory && (
        <p className="nearby-labs-note">
          This standard has no category on record, so labs are shown by location only.
        </p>
      )}

      {categoryUnmapped ? (
        <>
          <p className="nearby-labs-note">
            This standard&rsquo;s category (&ldquo;{rawCategory}&rdquo;) doesn&rsquo;t have a confident match
            among the labs directory&rsquo;s speciality categories, so no labs are shown here — that avoids
            showing unrelated ones.
          </p>
          <Link to="/labs" className="nearby-labs-link">
            See the full labs directory →
          </Link>
        </>
      ) : (
        <>
          <div className="nearby-labs-controls">
            <label>
              State
              <select value={stateChoice} onChange={(e) => setStateChoice(e.target.value)}>
                <option value="">Choose a state…</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              City (optional, ranks exact matches first)
              <input type="text" value={cityInput} onChange={(e) => setCityInput(e.target.value)} placeholder="e.g. Pune" />
            </label>
            <button type="button" onClick={handleUseLocation} disabled={locating}>
              {locating ? 'Locating…' : 'Use my location'}
            </button>
          </div>

          {stateChoice && (
            <>
              <h3>
                {mappedLabCategories
                  ? `Labs with a likely match for "${rawCategory}" in ${stateChoice}`
                  : `BIS recognised labs in ${stateChoice}`}
              </h3>
              {results.length === 0 ? (
                <EmptyState
                  message={
                    mappedLabCategories
                      ? `No labs with a likely match for "${rawCategory}" found in ${stateChoice}${
                          cityInput.trim() ? ` / ${cityInput.trim()}` : ''
                        }. Try clearing the city filter, or check a neighbouring state.`
                      : `No labs recorded for ${stateChoice} in the directory yet. Try a neighbouring state, or check the full labs directory.`
                  }
                />
              ) : (
                <ul className="nearby-labs-list">
                  {results.map(({ lab, matchType }) => (
                    <li key={lab.id} className={matchType === 'secondary' ? 'nearby-labs-secondary' : undefined}>
                      <span className="nearby-labs-main">
                        <span className="nearby-labs-name">{lab.name}</span>
                        {matchType === 'secondary' && (
                          <span className="nearby-labs-secondary-badge">Secondary match</span>
                        )}
                      </span>
                      <span className="nearby-labs-city">{lab.city}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/labs" className="nearby-labs-link">
                See the full labs directory →
              </Link>
            </>
          )}
        </>
      )}
    </section>
  );
}
