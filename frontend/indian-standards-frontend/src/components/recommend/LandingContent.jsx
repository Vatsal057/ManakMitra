import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { ALL_BIS_LABS, listStates } from '../../data/bisLabsData';
import './LandingContent.css';

const FULL_BIS_CATALOGUE_SIZE = '22,000+';
const QCO_TYPES = ['ISI', 'CRS', 'Hallmarking'];

const FEATURES = [
  {
    title: 'Multilingual input',
    body: 'Describe a product or paste a spec in any supported language — the engine translates before matching.',
  },
  {
    title: 'Conformity & QCO identification',
    body: 'Surfaces BIS certification status and Quality Control Order mandates alongside each recommended standard.',
  },
  {
    title: 'Allied & normative network',
    body: 'Automatically maps normative references, test methods, and safety standards linked to each result.',
  },
];

export function LandingContent() {
  const { languages } = useLanguage();
  const [corpusSize, setCorpusSize] = useState(null);

  useEffect(() => {
    apiClient.health().then((data) => setCorpusSize(data.corpus_size)).catch(() => {});
  }, []);

  const labCount = ALL_BIS_LABS.length;
  const stateCount = listStates().length;

  return (
    <section className="landing-content">
      <p className="landing-eyebrow">How it works</p>
      <h2 className="landing-heading">Find the Indian Standards that apply to your procurement</h2>
      <p className="landing-body">
        ManakMitra reads a product description or tender specification and identifies applicable Indian
        Standards, their certification status, and related normative references — so a spec section doesn't get
        challenged for missing or outdated standards.
      </p>

      <div className="landing-stats">
        <div className="landing-stat">
          <span className="landing-stat-value">{corpusSize !== null ? corpusSize : '—'} of {FULL_BIS_CATALOGUE_SIZE}</span>
          <span className="landing-stat-label">Published standards indexed</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-value">{labCount}</span>
          <span className="landing-stat-label">BIS recognised labs across {stateCount} states · Source: BIS LIMS directory</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-value">{QCO_TYPES.join(', ')}</span>
          <span className="landing-stat-label">QCO mandate types covered</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-value">{languages.length}</span>
          <span className="landing-stat-label">Languages supported</span>
        </div>
      </div>

      <p className="landing-mvp-note">
        This is an MVP with a deliberately limited corpus — {corpusSize !== null ? corpusSize : 'a subset'} of
        the full published BIS catalogue. A standard not appearing in results may still exist and apply to your
        procurement; this indexed count is not comprehensive coverage.
      </p>

      <div className="landing-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="landing-feature-card">
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
