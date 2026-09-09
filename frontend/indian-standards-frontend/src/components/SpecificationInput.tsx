import React from 'react';
import { Search, Sparkles, X, ArrowRight, CheckCircle2, Languages, Loader2, Info } from 'lucide-react';
import { PROCUREMENT_SAMPLE_PROMPTS, SUPPORTED_LANGUAGES } from '../services/mockData';
import { TranslationResult } from '../types/standards';

interface SpecificationInputProps {
  query: string;
  onQueryChange: (val: string) => void;
  onGetRecommendations: () => void;
  isLoading: boolean;
  stepMessage?: string;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  translationInfo?: TranslationResult | null;
}

export const SpecificationInput: React.FC<SpecificationInputProps> = ({
  query,
  onQueryChange,
  onGetRecommendations,
  isLoading,
  stepMessage,
  selectedLanguage,
  onLanguageChange,
  translationInfo,
}) => {
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && query.trim() && !isLoading) {
      e.preventDefault();
      onGetRecommendations();
    }
  };

  const handleSelectSample = (sampleText: string) => {
    onQueryChange(sampleText);
  };

  const handleClear = () => {
    onQueryChange('');
  };

  return (
    <section className="bg-uber-white rounded-xl border-2 border-uber-gray200 shadow-card p-5 sm:p-7 transition-all">
      {/* Header and Guidance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-uber-gray200">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-uber-black flex items-center gap-2 tracking-tight">
            <span>Procurement Product Description &amp; Technical Specification</span>
          </h2>
          <p className="text-sm text-uber-gray600 mt-1 font-normal">
            Enter tender schedule BoQ items, GeM product parameters, or engineering descriptions to discover mandatory BIS Indian Standards.
          </p>
        </div>

        {/* Input Language Quick Switch */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Languages className="w-4 h-4 text-uber-gray600" />
          <span className="text-xs sm:text-sm text-uber-gray700 font-bold">Input Language:</span>
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="text-xs sm:text-sm font-bold bg-uber-gray100 hover:bg-uber-gray200 text-uber-black rounded-lg px-3 py-1.5 border border-uber-gray300 focus:outline-none cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Non-English Translation Notice */}
      {selectedLanguage !== 'en' && (
        <div className="mb-4 px-4 py-3 bg-uber-blueLight border border-blue-200 rounded-lg flex items-start gap-3 text-sm text-uber-black">
          <Info className="w-5 h-5 text-uber-blue mt-0.5 shrink-0" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold">Multilingual Pipeline Active:</span> Specifications in{' '}
            <strong>{currentLangObj.name} ({currentLangObj.nativeName})</strong> will be translated through the{' '}
            <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono border border-blue-200">/translate</code> endpoint to match verified technical terminology before semantic standard retrieval.
          </div>
        </div>
      )}

      {/* Main Textarea Area */}
      <div className="relative">
        <textarea
          rows={4}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedLanguage === 'hi'
              ? 'यहाँ उत्पाद का तकनीकी विवरण या टेंडर विनिर्देश दर्ज करें... (उदा. 1100V पीवीसी इंसुलेटेड तांबे का केबल या ग्रेड 43 पोर्टलैंड सीमेंट)'
              : 'Paste item specification here (e.g., "3-core 1100V copper flexible PVC insulated electrical cable with flame retardant sheath for institutional building wiring")...'
          }
          className="w-full text-base sm:text-lg text-uber-black placeholder-uber-gray400 bg-uber-gray50 hover:bg-white focus:bg-white border-2 border-uber-gray300 focus:border-uber-black rounded-xl p-4 sm:p-5 focus:outline-none transition-all resize-y min-h-[130px] leading-relaxed"
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute top-4 right-4 p-1.5 text-uber-gray400 hover:text-uber-black rounded-md hover:bg-uber-gray200 transition-colors"
            title="Clear input"
            aria-label="Clear specification text"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Action bar below textarea */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="text-xs sm:text-sm text-uber-gray500 flex items-center gap-1.5">
          <span>Tip: Press</span>
          <kbd className="px-2 py-0.5 font-mono text-xs bg-uber-gray100 border border-uber-gray300 rounded text-uber-black font-bold">
            Ctrl + Enter
          </kbd>
          <span>to submit search instantly</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onGetRecommendations}
            disabled={!query.trim() || isLoading}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg text-sm sm:text-base font-bold transition-all shadow-base cursor-pointer ${
              !query.trim() || isLoading
                ? 'bg-uber-gray300 text-uber-gray500 cursor-not-allowed'
                : 'bg-uber-black text-white hover:bg-uber-gray800 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Identifying Standards...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5 text-white" />
                <span>Identify Mandatory Standards</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Verified Translation Preview Banner if available */}
      {translationInfo && (
        <div className="mt-4 p-4 bg-uber-gray50 rounded-lg border border-uber-gray200 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-bold text-uber-black mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-uber-green" />
            <span>Translated Technical Query (Used for Standards Matching):</span>
          </div>
          <p className="font-mono text-xs sm:text-sm text-uber-gray800 bg-white p-2.5 rounded border border-uber-gray300">
            "{translationInfo.translatedText}"
          </p>
        </div>
      )}

      {/* Sample Procurement Prompts */}
      <div className="mt-6 pt-5 border-t border-uber-gray200">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-uber-gray600 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Try Sample Procurement Tenders:</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROCUREMENT_SAMPLE_PROMPTS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSample(sample.query)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold bg-uber-white hover:bg-uber-gray100 active:bg-uber-gray200 text-uber-black px-3.5 py-2 rounded-lg border border-uber-gray300 hover:border-uber-black transition-all text-left cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-uber-black shrink-0"></span>
              <span>{sample.title}</span>
            </button>
          ))}
        </div>
      </div>

    </section>
  );
};
