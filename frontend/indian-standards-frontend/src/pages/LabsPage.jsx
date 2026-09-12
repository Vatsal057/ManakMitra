import { useMemo, useState } from 'react';
import { LabsMap } from '../components/labs/LabsMap';
import { LabFilters } from '../components/labs/LabFilters';
import { LabCard } from '../components/labs/LabCard';
import { EmptyState } from '../components/Common/EmptyState';
import {
  ALL_BIS_LABS,
  listStates,
  filterByState,
  searchByText,
  listPrimaryCategories,
  listSecondaryCategories,
  filterByPrimaryCategory,
  filterBySecondaryCategory,
} from '../data/bisLabsData';
import './LabsPage.css';

const states = listStates();
const primaryCategories = listPrimaryCategories();

export function LabsPage() {
  const [searchText, setSearchText] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedPrimary, setSelectedPrimary] = useState('all');
  const [selectedSecondary, setSelectedSecondary] = useState('all');

  const stateFiltered = useMemo(() => filterByState(ALL_BIS_LABS, selectedState), [selectedState]);

  const labsInPrimary = useMemo(
    () => filterByPrimaryCategory(ALL_BIS_LABS, selectedPrimary),
    [selectedPrimary]
  );
  const secondaryCategories = useMemo(() => listSecondaryCategories(labsInPrimary), [labsInPrimary]);

  const filtered = useMemo(() => {
    let labs = stateFiltered;
    labs = searchByText(labs, searchText);
    labs = filterByPrimaryCategory(labs, selectedPrimary);
    labs = filterBySecondaryCategory(labs, selectedSecondary);
    return labs;
  }, [stateFiltered, searchText, selectedPrimary, selectedSecondary]);

  const filtersActive =
    searchText !== '' || selectedState !== 'all' || selectedPrimary !== 'all' || selectedSecondary !== 'all';

  const handleReset = () => {
    setSearchText('');
    setSelectedState('all');
    setSelectedPrimary('all');
    setSelectedSecondary('all');
  };

  const handlePrimaryChange = (value) => {
    setSelectedPrimary(value);
    setSelectedSecondary('all');
  };

  return (
    <div className="labs-page">
      <h1>Labs Directory</h1>
      <p className="labs-page-subtitle">BIS recognised testing laboratories — {ALL_BIS_LABS.length} labs across 24 states.</p>

      <LabsMap
        selectedState={selectedState}
        onStateSelect={setSelectedState}
        selectedPrimary={selectedPrimary}
      />

      <LabFilters
        searchText={searchText}
        onSearchTextChange={setSearchText}
        selectedState={selectedState}
        onSelectedStateChange={setSelectedState}
        states={states}
        primaryCategories={primaryCategories}
        selectedPrimary={selectedPrimary}
        onSelectedPrimaryChange={handlePrimaryChange}
        secondaryCategories={secondaryCategories}
        selectedSecondary={selectedSecondary}
        onSelectedSecondaryChange={setSelectedSecondary}
        resultCount={{ filtered: filtered.length, totalAll: ALL_BIS_LABS.length }}
        onReset={handleReset}
        filtersActive={filtersActive}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No laboratories found"
          message="Try clearing the state filter, the speciality filters, or your search text."
          action={
            <button type="button" onClick={handleReset}>
              Reset filters
            </button>
          }
        />
      ) : (
        <div className="labs-grid">
          {filtered.map((lab) => (
            <LabCard key={lab.id} lab={lab} />
          ))}
        </div>
      )}
    </div>
  );
}
