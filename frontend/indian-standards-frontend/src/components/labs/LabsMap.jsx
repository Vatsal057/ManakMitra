import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ALL_BIS_LABS, filterByPrimaryCategory } from '../../data/bisLabsData';
import './LabsMap.css';

// Wraps the standalone public/bis-labs-map.html (ported from v1, with the
// dark-theme unselected-state contrast bug fixed — see that file's CSS).
// Talks to it over postMessage: we push state/theme/category selection in,
// it tells us when a user clicks a state on the map.
//
// Messages are only sent once the iframe has actually loaded (postMessage
// sent before the iframe's own listener attaches is silently dropped, not
// queued) — the `loaded` gate below, plus re-sending on every relevant
// prop/theme change, is what makes this reflect live changes and not just
// the value at initial load.
export function LabsMap({ selectedState, onStateSelect, selectedPrimary }) {
  const iframeRef = useRef(null);
  const { theme } = useTheme();
  const [loaded, setLoaded] = useState(false);

  const categoryIds = useMemo(() => {
    if (!selectedPrimary || selectedPrimary === 'all') return null;
    return filterByPrimaryCategory(ALL_BIS_LABS, selectedPrimary).map((lab) => lab.id);
  }, [selectedPrimary]);

  const post = (action, payload) => {
    iframeRef.current?.contentWindow?.postMessage({ source: 'manak-mitra', action, payload }, '*');
  };

  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.data || e.data.source !== 'bis-map') return;
      if (e.data.action === 'stateSelected') onStateSelect(e.data.payload);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onStateSelect]);

  useEffect(() => {
    if (!loaded) return;
    post('selectState', selectedState || 'all');
  }, [selectedState, loaded]);

  useEffect(() => {
    if (!loaded) return;
    post('setTheme', theme);
  }, [theme, loaded]);

  useEffect(() => {
    if (!loaded) return;
    post('filterCategory', categoryIds);
  }, [categoryIds, loaded]);

  return (
    <div className="labs-map">
      <iframe
        ref={iframeRef}
        src="/bis-labs-map.html"
        title="BIS recognised laboratories — interactive map of India"
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
