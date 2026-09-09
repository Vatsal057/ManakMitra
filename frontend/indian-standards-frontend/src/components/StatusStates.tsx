import React from 'react';
import { 
  SearchX, 
  HelpCircle, 
  RefreshCw, 
  ServerOff, 
  Settings, 
  ArrowRight,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface LoadingStateProps {
  stepMessage?: string;
  isTranslating?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  stepMessage = 'Identifying applicable Indian Standards...',
  isTranslating = false
}) => {
  return (
    <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 p-8 sm:p-14 text-center shadow-card my-8">
      <div className="max-w-lg mx-auto flex flex-col items-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-uber-gray200 border-t-uber-black animate-spin flex items-center justify-center"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-3 h-3 bg-uber-blue rounded-full animate-ping"></span>
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-extrabold text-uber-black mb-2 tracking-tight">
          {stepMessage}
        </h3>
        <p className="text-sm text-uber-gray600 mb-6 max-w-md leading-relaxed">
          Querying the Bureau of Indian Standards (BIS) technical catalogue, matching specification parameters, and evaluating conformity mandates.
        </p>

        {/* Step-by-step progress */}
        <div className="w-full space-y-3 text-left bg-uber-gray50 p-4 sm:p-5 rounded-xl border border-uber-gray300 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className={`w-4 h-4 ${isTranslating ? 'text-amber-500 animate-pulse' : 'text-uber-green'}`} />
            <span className={isTranslating ? 'font-bold text-uber-black' : 'text-uber-gray700'}>
              1. {isTranslating ? 'Translating query via /translate pipeline...' : 'Processed specification query'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-uber-blue animate-spin" />
            <span className="font-bold text-uber-black">
              2. Vector semantic matching across BIS catalogue
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-uber-gray500 font-medium">
            <span className="w-4 h-4 rounded-full border border-uber-gray400 flex items-center justify-center text-[10px] font-bold">3</span>
            <span>3. Cross-referencing mandatory QCOs &amp; BIS conformity schemes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  query: string;
  onReset: () => void;
  onTrySample: (sample: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onReset, onTrySample }) => {
  return (
    <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 p-8 sm:p-14 text-center shadow-card my-8">
      <div className="max-w-xl mx-auto flex flex-col items-center">
        <div className="w-16 h-16 bg-uber-gray100 border border-uber-gray300 rounded-2xl flex items-center justify-center text-uber-black mb-4 shadow-base">
          <SearchX className="w-8 h-8" />
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-uber-black mb-2 tracking-tight">
          No Strong BIS Matches Identified
        </h3>
        <p className="text-sm sm:text-base text-uber-gray600 mb-6 leading-relaxed">
          The specification query did not meet the confidence threshold for standard classification. Indian Standards are indexed by formal technical parameters.
        </p>

        {/* Procurement Advice Box */}
        <div className="w-full text-left bg-uber-gray50 rounded-xl p-5 border border-uber-gray300 mb-6">
          <h4 className="text-xs sm:text-sm font-extrabold text-uber-black uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-uber-blue" />
            <span>Procurement Specification Recommendations:</span>
          </h4>
          <ul className="text-xs sm:text-sm text-uber-gray700 space-y-2 list-disc list-inside leading-relaxed">
            <li>Include core material characteristics (e.g. <em>copper, PVC, Ordinary Portland Cement, HDPE</em>).</li>
            <li>Specify electrical, thermal, or physical parameters (e.g. <em>1100V, Grade 43, 90W, IP66</em>).</li>
            <li>If entering a tender schedule in a regional language, verify technical terms or try equivalent English terms.</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onReset}
            className="px-5 py-2.5 bg-uber-white hover:bg-uber-gray100 text-uber-black text-sm font-bold rounded-lg border-2 border-uber-gray300 transition-colors cursor-pointer"
          >
            Clear and Rephrase
          </button>
          <button
            onClick={() => onTrySample('Procurement of 3-core copper flexible PVC insulated power cable 1100V')}
            className="px-5 py-2.5 bg-uber-black hover:bg-uber-gray800 text-white text-sm font-bold rounded-lg shadow-base transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Try Sample Cable Spec</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ErrorStateProps {
  error: string;
  baseUrl: string;
  onRetry: () => void;
  onSwitchToDemo?: () => void;
  onOpenSettings: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  baseUrl,
  onRetry,
  onOpenSettings,
}) => {
  return (
    <div className="bg-uber-white rounded-xl border-2 border-uber-red/30 p-8 sm:p-12 shadow-card my-8">
      <div className="max-w-xl mx-auto flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-uber-redLight border-2 border-uber-red rounded-2xl flex items-center justify-center text-uber-red mb-4 shadow-base">
          <ServerOff className="w-8 h-8" />
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-uber-black mb-2 tracking-tight">
          Service Connection Notice
        </h3>
        <p className="text-sm text-uber-gray700 mb-4">
          Unable to establish communication with the endpoint at <code className="bg-uber-gray100 text-uber-black px-2 py-0.5 rounded font-mono text-xs sm:text-sm font-bold border border-uber-gray300">{baseUrl}</code>.
        </p>

        <div className="w-full bg-uber-redLight border border-uber-red/20 rounded-xl p-4 text-left text-xs sm:text-sm font-mono text-uber-black mb-6 break-all">
          {error}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onRetry}
            className="px-5 py-2.5 bg-uber-black hover:bg-uber-gray800 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-base"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="px-5 py-2.5 bg-uber-white hover:bg-uber-gray100 text-uber-black text-sm font-bold rounded-lg border-2 border-uber-gray300 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Configure Endpoint URL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
