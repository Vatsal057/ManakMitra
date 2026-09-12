import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InfoTooltip } from '../Common/InfoTooltip';
import { useLanguage } from '../../context/LanguageContext';
import { useSearch } from '../../context/SearchContext';
import { looksLikeIsIdentifier, normalizeIdentifier } from '../../utils/isIdentifier';
import { encodeStandardSlug } from '../../utils/standardSlug';
import './NavQuickSearch.css';

const QUICK_SEARCH_TOP_K = 20;

// Fast lookup by identifier or a short keyword — distinct from the main
// specification search. An identifier navigates straight to the detail
// page (which already has its own exact-identifier fallback fetch and
// "not found" empty state — this path never touches SearchContext, since
// an identifier lookup isn't a "search" in the results-page sense). A
// keyword calls the same SearchContext.runSearch the main search page's
// submit handler uses, then navigates to /recommend to show it — calling
// runSearch directly (rather than stashing the query in router state for
// /recommend to pick up on mount) means it works whether or not /recommend
// is already mounted, and never leaves a stale flag sitting in a history
// entry's state ready to re-fire and clobber good results on Back.
export function NavQuickSearch() {
  const [value, setValue] = useState('');
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { language } = useLanguage();
  const { runSearch } = useSearch();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    if (looksLikeIsIdentifier(trimmed)) {
      navigate(`/standard/${encodeStandardSlug(normalizeIdentifier(trimmed))}`);
    } else {
      runSearch(trimmed, QUICK_SEARCH_TOP_K, language);
      navigate('/recommend');
    }
    setValue('');
    setExpanded(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setValue('');
      inputRef.current?.blur();
      setExpanded(false);
    }
  };

  return (
    <form className={`nav-quick-search ${expanded ? 'expanded' : ''}`} onSubmit={handleSubmit} role="search">
      <button
        type="button"
        className="nav-quick-search-icon-toggle"
        aria-label="Open quick search"
        onClick={() => {
          setExpanded(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="nav-quick-search-field">
        <label htmlFor="nav-quick-search-input" className="visually-hidden">
          Search IS code or keyword
        </label>
        <input
          id="nav-quick-search-input"
          ref={inputRef}
          type="text"
          className="nav-quick-search-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => !value && setExpanded(false)}
          placeholder="Search IS code or keyword"
        />
        <button type="submit" className="nav-quick-search-submit" aria-label="Search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <InfoTooltip label="About quick search">
        For a specific standard number (e.g. IS 732:1989) or a short keyword. Paste full specification text in
        the main search box on the Search page instead.
      </InfoTooltip>
    </form>
  );
}
