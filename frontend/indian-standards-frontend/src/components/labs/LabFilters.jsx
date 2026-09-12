import { InfoTooltip } from '../Common/InfoTooltip';
import './LabFilters.css';

export function LabFilters({
  searchText,
  onSearchTextChange,
  selectedState,
  onSelectedStateChange,
  states,
  primaryCategories,
  selectedPrimary,
  onSelectedPrimaryChange,
  secondaryCategories,
  selectedSecondary,
  onSelectedSecondaryChange,
  resultCount,
  onReset,
  filtersActive,
}) {
  return (
    <div className="lab-filters">
      <div className="lab-filters-row">
        <div className="lab-filters-field lab-filters-field-search">
          <span className="lab-filters-field-label">Search</span>
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
            placeholder="Name, city, or lab code"
            aria-label="Search laboratories"
          />
        </div>

        <div className="lab-filters-field">
          <span className="lab-filters-field-label">State</span>
          <select value={selectedState} onChange={(e) => onSelectedStateChange(e.target.value)} aria-label="Filter by state">
            <option value="all">All states ({resultCount.totalAll})</option>
            {states.map(({ state, count }) => (
              <option key={state} value={state}>
                {state} ({count})
              </option>
            ))}
          </select>
        </div>

        <div className="lab-filters-field">
          <span className="lab-filters-field-label">
            Speciality
            <InfoTooltip label="About the speciality filters">
              Categories are derived from each lab's name and address, not taken from BIS's official
              accreditation records — confidence varies per record (shown on each lab's card). Check the
              official BIS scope link for authoritative coverage.
            </InfoTooltip>
          </span>
          <select
            value={selectedPrimary}
            onChange={(e) => onSelectedPrimaryChange(e.target.value)}
            aria-label="Filter by primary speciality"
          >
            <option value="all">All specialities</option>
            {primaryCategories.map(({ category, count }) => (
              <option key={category} value={category}>
                {category} ({count})
              </option>
            ))}
          </select>
        </div>

        <div className="lab-filters-field">
          <span className="lab-filters-field-label">Secondary speciality</span>
          <select
            value={selectedSecondary}
            onChange={(e) => onSelectedSecondaryChange(e.target.value)}
            aria-label="Filter by secondary speciality"
            disabled={secondaryCategories.length === 0}
          >
            <option value="all">All</option>
            {secondaryCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {filtersActive && (
          <button type="button" className="lab-filters-reset" onClick={onReset}>
            Reset filters
          </button>
        )}
      </div>

      <p className="lab-filters-count" role="status" aria-live="polite">
        Showing {resultCount.filtered} of {resultCount.totalAll} laboratories
      </p>
    </div>
  );
}
