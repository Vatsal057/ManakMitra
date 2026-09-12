import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTender } from '../../context/TenderContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { NavQuickSearch } from './NavQuickSearch';
import './TopNav.css';

// Same theme-swap pattern used everywhere else a theme-dependent asset is
// loaded (data-theme driven, via useTheme()) — not reinvented here.
const WORDMARK_SRC = {
  light: '/logos/Manak Mitra - black on white.png',
  dark: '/logos/Manak Mitra - white on black.png',
};

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2 3h2l1.2 9.6a2 2 0 0 0 2 1.7h6.6a2 2 0 0 0 2-1.6L17 7H5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="17" r="1.3" fill="currentColor" />
      <circle cx="14.5" cy="17" r="1.3" fill="currentColor" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4M15.8 15.8l-1.4-1.4M5.6 5.6L4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M17 11.5A7.5 7.5 0 0 1 8.5 3 7.5 7.5 0 1 0 17 11.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function TopNav({ onOpenCart }) {
  const { totalCount } = useTender();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, languages } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="top-nav">
      <NavLink to="/recommend" className="top-nav-brand">
        <span className="top-nav-logo-col">
          <img className="top-nav-logo" src="/logos/Manak Mitra logo.png" alt="" />
          <img className="top-nav-wordmark" src={WORDMARK_SRC[theme]} alt="ManakMitra" />
        </span>
        <span className="top-nav-tagline">BIS Standards Recommender</span>
      </NavLink>

      <button
        type="button"
        className="top-nav-menu-toggle"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <MenuIcon />
      </button>

      <nav className={`top-nav-links ${menuOpen ? 'open' : ''}`} aria-label="Main">
        <NavLink to="/recommend" className={({ isActive }) => (isActive ? 'active' : undefined)} onClick={() => setMenuOpen(false)}>
          Recommend
        </NavLink>
        <NavLink to="/labs" className={({ isActive }) => (isActive ? 'active' : undefined)} onClick={() => setMenuOpen(false)}>
          Labs
        </NavLink>
        <NavLink to="/audit" className={({ isActive }) => (isActive ? 'active' : undefined)} onClick={() => setMenuOpen(false)}>
          Audit
        </NavLink>
      </nav>

      <NavQuickSearch />

      <div className="top-nav-actions">
        <label className="top-nav-lang">
          <span className="visually-hidden">Input language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="top-nav-theme-toggle"
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>

        <button type="button" className="top-nav-cart" aria-label={`Tender cart, ${totalCount} standards`} onClick={onOpenCart}>
          <CartIcon />
          {totalCount > 0 && <span className="top-nav-cart-badge">{totalCount}</span>}
        </button>
      </div>
    </header>
  );
}
