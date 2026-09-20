import { useState } from 'react';
import { Spinner } from '../Common/Spinner';
import { SAMPLE_SPECS } from '../../data/sampleSpecs';
import { useLanguage } from '../../context/LanguageContext';
import './SearchPanel.css';

const TOP_K = 20;

export function SearchPanel({ onSearch, loading, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const { t, language } = useLanguage();

  const submit = (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSearch(trimmed, TOP_K);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit(query);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submit(query);
    }
  };

  const handleChipClick = (text) => {
    setQuery(text);
    submit(text);
  };

  return (
    <form className="search-panel" onSubmit={handleSubmit}>
      <div className="search-panel-header">
        <div>
          <h2 className="search-panel-heading">
            {t('mandatedSpecs', 'Procurement Product Description & Technical Specification')}
          </h2>
          <p className="search-panel-description">
            {t('inputDescription', 'Paste BoQ items, GeM product parameters, or engineering descriptions from your tender.')}
          </p>
        </div>
      </div>

      <label htmlFor="search-query" className="visually-hidden">
        {t('inputTitle', 'Product description or specification')}
      </label>
      <textarea
        id="search-query"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('placeholder', 'e.g. cement for RCC foundations')}
        rows={5}
        disabled={loading}
      />

      <div className="search-panel-row">
        <span className="search-panel-hint">{t('tipPress', 'Tip: press Ctrl+Enter to submit')}</span>
        <button type="submit" className="search-panel-submit" disabled={loading || !query.trim()}>
          {loading ? t('btnIdentifying', 'Identifying Standards...') : t('btnIdentify', 'Identify applicable standards')}
        </button>
      </div>

      {loading && <Spinner label={t('btnIdentifying', 'Searching…')} />}

      <hr className="search-panel-divider" />

      <div className="search-panel-samples">
        <span className="search-panel-samples-label">
          {t('samplePromptsHeader', 'Try a sample specification:')}
        </span>
        <div className="search-panel-chips">
          {SAMPLE_SPECS.map((sample) => {
            const label = sample.titleKey ? t(sample.titleKey, sample.label) : sample.label;
            const queryText = sample.queryKey && language !== 'en' ? t(sample.queryKey, sample.text) : sample.text;
            return (
              <button
                type="button"
                key={sample.label}
                className="search-panel-chip"
                onClick={() => handleChipClick(queryText)}
                disabled={loading}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}
