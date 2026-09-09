import React from 'react';
import { X, ExternalLink, MapPin } from 'lucide-react';

interface LabsMapPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStateClick?: (state: string) => void;
}

export const LabsMapPanel: React.FC<LabsMapPanelProps> = ({
  isOpen,
  onClose,
  onStateClick,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-uber-black/85 backdrop-blur-sm p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-uber-black w-full max-w-7xl h-[92vh] rounded-2xl shadow-modal overflow-hidden flex flex-col border-2 border-uber-gray700 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-uber-black text-white border-b border-uber-gray800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-uber-gray900 border border-uber-gray700 flex items-center justify-center text-white">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  BIS Recognized Laboratories Map of India
                </h2>
                <span className="hidden sm:inline-block font-mono text-xs bg-uber-gray800 text-uber-gray300 px-2 py-0.5 rounded border border-uber-gray700 font-bold">
                  431 Labs • 24 States
                </span>
              </div>
              <p className="text-xs text-uber-gray400 mt-0.5">
                Official Bureau of Indian Standards (LIMS BIS) Interactive State Directory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/bis-labs-map.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-uber-gray800 hover:bg-uber-gray700 text-white text-xs font-bold rounded-lg border border-uber-gray600 transition-colors"
            >
              <span>Open Standalone</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-uber-gray800 text-uber-gray300 hover:text-white transition-colors cursor-pointer"
              aria-label="Close map"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Embedded HTML Map File */}
        <div className="flex-1 w-full bg-black overflow-hidden relative">
          <iframe
            src="/bis-labs-map.html"
            title="BIS Recognized Laboratories India Interactive Map"
            className="w-full h-full border-0"
          />
        </div>

      </div>
    </div>
  );
};
