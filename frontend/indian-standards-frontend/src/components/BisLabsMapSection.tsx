import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, ExternalLink, MapPin, Layers, RefreshCw } from 'lucide-react';

interface BisLabsMapSectionProps {
  selectedState?: string;
  onStateSelect?: (state: string) => void;
  className?: string;
  id?: string;
}

export const BisLabsMapSection: React.FC<BisLabsMapSectionProps> = ({
  selectedState,
  onStateSelect,
  className = '',
  id = 'bis-labs-map-section',
}) => {
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Synchronize state selection into the iframe
  useEffect(() => {
    if (selectedState && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { source: 'manak-mitra', action: 'selectState', payload: selectedState },
        '*'
      );
    }
  }, [selectedState]);

  // Handle messages from the map iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || e.data.source !== 'bis-map') return;
      if (e.data.action === 'stateSelected' && onStateSelect) {
        onStateSelect(e.data.payload);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onStateSelect]);

  // Handle Escape key to minimize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  const handleResetMap = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { source: 'manak-mitra', action: 'selectState', payload: 'all' },
        '*'
      );
    }
  };

  return (
    <>
      {/* Minimized / In-Page Section Container */}
      <section
        id={id}
        className={`bg-uber-white rounded-xl border-2 border-uber-gray200 shadow-card overflow-hidden transition-all duration-300 ${className}`}
      >
        {/* Section Header Bar (Uber Base Design System) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b-2 border-uber-gray200 bg-uber-gray50 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-uber-black flex items-center justify-center text-white shrink-0">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-uber-black tracking-tight">
                  BIS Recognized Laboratories Map
                </h3>
                <span className="px-2 py-0.5 text-xs font-bold bg-uber-gray200 text-uber-black rounded font-mono">
                  431 Labs • 24 States
                </span>
              </div>
              <p className="text-xs sm:text-sm text-uber-gray600 font-medium mt-0.5">
                Interactive geographic distribution of accredited testing facilities across India · Source: BIS LIMS lab directory
              </p>
            </div>
          </div>

          {/* Action controls */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={handleResetMap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-uber-white hover:bg-uber-gray100 text-uber-black border border-uber-gray300 rounded-lg transition-colors cursor-pointer"
              title="Reset map view to All India"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <a
              href="/bis-labs-map.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-uber-white hover:bg-uber-gray100 text-uber-black border border-uber-gray300 rounded-lg transition-colors"
              title="Open full map standalone in new tab"
            >
              <span>Full Tab</span>
              <ExternalLink className="w-3.5 h-3.5 text-uber-gray600" />
            </a>

            <button
              onClick={() => setIsMaximized(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold bg-uber-black hover:bg-uber-gray800 text-white rounded-lg transition-colors cursor-pointer shadow-base"
              title="Maximize map to full screen view"
            >
              <Maximize2 className="w-4 h-4 text-amber-400" />
              <span>Maximize Map</span>
            </button>
          </div>
        </div>

        {/* Embedded Map Frame (Visible, Not Too Small) */}
        <div className="relative w-full h-[520px] sm:h-[580px] lg:h-[620px] bg-black">
          <iframe
            ref={iframeRef}
            src="/bis-labs-map.html"
            title="BIS Recognized Laboratories India Interactive Map"
            className="w-full h-full border-0"
            loading="lazy"
          />

          {/* Corner Quick Maximize overlay pill */}
          <button
            onClick={() => setIsMaximized(true)}
            className="absolute top-3 right-3 bg-uber-black/85 hover:bg-uber-black text-white px-3 py-1.5 rounded-lg border border-uber-gray700 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all cursor-pointer z-10"
            title="Maximize map"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Maximize</span>
          </button>
        </div>
      </section>

      {/* Maximized Fullscreen Overlay Mode */}
      {isMaximized && (
        <div className="fixed inset-0 z-50 bg-uber-black/95 backdrop-blur-md p-2 sm:p-4 flex flex-col animate-in fade-in duration-200">
          
          {/* Top Bar inside Maximized View */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-uber-surface text-white rounded-t-xl border-t border-x border-uber-gray800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-uber-black border border-uber-gray700 flex items-center justify-center text-white">
                <MapPin className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                    Manak Mitra • BIS Laboratories Geographic Map
                  </h2>
                  <span className="hidden sm:inline-block font-mono text-xs bg-uber-gray800 text-uber-gray300 px-2.5 py-0.5 rounded border border-uber-gray700 font-bold">
                    431 Laboratories Across 24 States
                  </span>
                </div>
                <p className="text-xs text-uber-gray400 hidden sm:block">
                  Press <kbd className="px-1.5 py-0.5 bg-uber-gray800 rounded font-mono text-white text-[11px]">ESC</kbd> or click Minimize to return to dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMaximized(false)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-uber-gray200 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-lg"
              >
                <Minimize2 className="w-4 h-4 text-black" />
                <span>Minimize Map</span>
              </button>
            </div>
          </div>

          {/* Full-Height Iframe View */}
          <div className="flex-1 w-full bg-black rounded-b-xl overflow-hidden border-b border-x border-uber-gray800">
            <iframe
              src="/bis-labs-map.html"
              title="BIS Recognized Laboratories India Interactive Map Full View"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </>
  );
};
