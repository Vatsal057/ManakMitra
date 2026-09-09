import React, { useState } from 'react';
import { 
  X, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Database,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { ApiConfig } from '../types/standards';
import { DEFAULT_CONFIG, checkBackendHealth } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSaveConfig: (newConfig: ApiConfig) => void;
  onStatusChange?: (isOnline: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onStatusChange,
}) => {
  const [formConfig, setFormConfig] = useState<ApiConfig>({ ...config });
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const isAlive = await checkBackendHealth(formConfig.baseUrl);
      if (isAlive) {
        setTestResult({
          success: true,
          message: `Connected successfully to Manak Mitra backend service at ${formConfig.baseUrl}!`,
        });
        if (onStatusChange) onStatusChange(true);
      } else {
        setTestResult({
          success: false,
          message: `Could not reach ${formConfig.baseUrl}. Please verify your server process is active (e.g. uvicorn main:app --port 8000).`,
        });
        if (onStatusChange) onStatusChange(false);
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Connection test error: ${e.message || 'Host unreachable'}`,
      });
      if (onStatusChange) onStatusChange(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(formConfig);
    onClose();
  };

  const handleReset = () => {
    setFormConfig({ ...DEFAULT_CONFIG });
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-uber-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-uber-white rounded-xl max-w-xl w-full shadow-modal border-2 border-uber-gray200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-uber-black text-white flex items-center justify-between border-b border-uber-gray800">
          <div className="flex items-center space-x-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                Manak Mitra • System &amp; Service Settings
              </h3>
              <p className="text-xs text-uber-gray400 font-medium mt-0.5">
                Configure actual backend endpoints and catalog synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-uber-gray300 hover:text-white p-1.5 rounded-lg hover:bg-uber-gray800 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5 text-sm">
          
          <p className="text-uber-gray700 leading-relaxed font-medium">
            Connect Manak Mitra to your operational recommendation and translation API. The system uses these endpoints to process procurement tenders and retrieve verified BIS catalogue entries.
          </p>

          {/* Base URL */}
          <div>
            <label className="block font-bold text-uber-black mb-1.5 text-sm sm:text-base">
              Service Base URL:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formConfig.baseUrl}
                onChange={(e) => setFormConfig({ ...formConfig, baseUrl: e.target.value })}
                placeholder="http://localhost:8000"
                className="flex-1 font-mono text-sm px-3.5 py-2.5 bg-uber-gray50 border-2 border-uber-gray300 focus:border-uber-black rounded-lg focus:bg-white text-uber-black font-semibold transition-all"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !formConfig.baseUrl}
                className="px-4 py-2.5 bg-uber-black hover:bg-uber-gray800 text-white font-bold text-xs sm:text-sm rounded-lg flex items-center gap-2 transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-base"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                )}
                <span>Test Ping</span>
              </button>
            </div>
            <p className="text-xs text-uber-gray500 mt-1 font-medium">
              Accepts <code className="font-mono text-uber-black font-bold">http://localhost:8000</code> or your production server host.
            </p>
          </div>

          {/* Test connection alert */}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg border-2 flex items-start gap-3 text-xs sm:text-sm ${
                testResult.success
                  ? 'bg-uber-greenLight border-emerald-300 text-emerald-950 font-medium'
                  : 'bg-uber-yellowLight border-amber-300 text-amber-950 font-medium'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-uber-green mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              )}
              <div className="leading-snug">{testResult.message}</div>
            </div>
          )}

          {/* Endpoints mapping */}
          <div className="space-y-3 pt-3 border-t border-uber-gray200">
            <span className="font-extrabold text-uber-black text-sm uppercase tracking-wide">
              API Route Mappings:
            </span>
            
            <div className="grid grid-cols-3 gap-2.5 items-center">
              <span className="text-uber-gray700 font-mono text-xs sm:text-sm font-bold">/recommend</span>
              <input
                type="text"
                value={formConfig.recommendEndpoint}
                onChange={(e) => setFormConfig({ ...formConfig, recommendEndpoint: e.target.value })}
                className="col-span-2 font-mono text-xs sm:text-sm px-3 py-2 bg-uber-gray50 border-2 border-uber-gray300 rounded-lg text-uber-black font-medium"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5 items-center">
              <span className="text-uber-gray700 font-mono text-xs sm:text-sm font-bold">/allied/{'{id}'}</span>
              <input
                type="text"
                value={formConfig.alliedEndpoint}
                onChange={(e) => setFormConfig({ ...formConfig, alliedEndpoint: e.target.value })}
                className="col-span-2 font-mono text-xs sm:text-sm px-3 py-2 bg-uber-gray50 border-2 border-uber-gray300 rounded-lg text-uber-black font-medium"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5 items-center">
              <span className="text-uber-gray700 font-mono text-xs sm:text-sm font-bold">/translate</span>
              <input
                type="text"
                value={formConfig.translateEndpoint}
                onChange={(e) => setFormConfig({ ...formConfig, translateEndpoint: e.target.value })}
                className="col-span-2 font-mono text-xs sm:text-sm px-3 py-2 bg-uber-gray50 border-2 border-uber-gray300 rounded-lg text-uber-black font-medium"
              />
            </div>
          </div>

          {/* Operational Resilience Cache */}
          <div className="pt-3 border-t border-uber-gray200">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formConfig.useDemoFallback}
                onChange={(e) => setFormConfig({ ...formConfig, useDemoFallback: e.target.checked })}
                className="mt-1 rounded text-uber-black focus:ring-black w-4 h-4"
              />
              <div>
                <span className="font-extrabold text-uber-black text-sm">
                  Show demo data when the backend is unreachable
                </span>
                <p className="text-xs text-uber-gray600 mt-0.5 leading-relaxed font-medium">
                  When enabled, a handful of illustrative sample standards are shown instead of live results if the backend can't be reached, with a persistent on-screen banner marking them as demo data. Off by default so a dead backend fails visibly instead of silently substituting fabricated results.
                </p>
              </div>
            </label>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-uber-gray50 border-t border-uber-gray200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs sm:text-sm text-uber-gray600 hover:text-uber-black underline font-bold cursor-pointer"
          >
            Reset to Defaults
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-uber-gray700 hover:bg-uber-gray200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs sm:text-sm font-extrabold text-white bg-uber-black hover:bg-uber-gray800 rounded-lg shadow-base transition-colors cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
