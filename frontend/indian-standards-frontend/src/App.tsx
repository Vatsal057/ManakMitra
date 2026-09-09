import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SpecificationInput } from './components/SpecificationInput';
import { ResultsList } from './components/ResultsList';
import { LoadingState, EmptyState, ErrorState } from './components/StatusStates';
import { SettingsModal } from './components/SettingsModal';
import { LabsSearch } from './components/LabsSearch';
import { LabsMapPanel } from './components/LabsMapPanel';
import { TenderAuditView } from './components/TenderAuditView';
import { 
  RecommendedStandard, 
  ApiConfig, 
  TranslationResult 
} from './types/standards';
import { 
  getApiConfig, 
  saveApiConfig, 
  fetchRecommendations,
  translateQuery,
  checkBackendHealth,
  fetchCorpusSize
} from './services/api';
import { Scale, FlaskConical, Compass, ShieldCheck } from 'lucide-react';

type ActiveTab = 'standards' | 'labs' | 'audit';

export const App: React.FC = () => {
  const [config, setConfig] = useState<ApiConfig>(getApiConfig());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('standards');
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const [labsSelectedState, setLabsSelectedState] = useState<string | undefined>(undefined);

  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [query, setQuery] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [translationInfo, setTranslationInfo] = useState<TranslationResult | null>(null);

  const [standards, setStandards] = useState<RecommendedStandard[] | null>(null);
  const [isDemoFallback, setIsDemoFallback] = useState<boolean>(false);
  const [abstained, setAbstained] = useState<boolean>(false);
  const [abstainReason, setAbstainReason] = useState<string | null>(null);
  const [confidenceSignal, setConfidenceSignal] = useState<number | undefined>(undefined);
  const [confidenceBand, setConfidenceBand] = useState<'high' | 'moderate' | 'low'>('high');
  const [corpusSize, setCorpusSize] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Health check on mount
  useEffect(() => {
    checkBackendHealth(config.baseUrl).then(setIsBackendOnline);
    fetchCorpusSize(config.baseUrl).then(setCorpusSize);
  }, [config.baseUrl]);

  const handleSaveConfig = (newConfig: ApiConfig) => {
    setConfig(newConfig);
    saveApiConfig(newConfig);
    checkBackendHealth(newConfig.baseUrl).then(setIsBackendOnline);
    fetchCorpusSize(newConfig.baseUrl).then(setCorpusSize);
  };

  const handleGetRecommendations = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStandards(null);
    setSubmittedQuery(query);

    let effectiveQuery = query.trim();

    try {
      // Step 1: Check if non-English language selected -> invoke /translate
      if (selectedLanguage !== 'en') {
        setIsTranslating(true);
        setStepMessage(`Translating specification from ${selectedLanguage.toUpperCase()} to English...`);
        
        const translated = await translateQuery(effectiveQuery, selectedLanguage, config);
        
        setTranslationInfo({
          originalText: effectiveQuery,
          translatedText: translated,
          sourceLang: selectedLanguage,
          targetLang: 'en',
        });
        
        effectiveQuery = translated;
        setIsTranslating(false);
      } else {
        setTranslationInfo(null);
      }

      // Step 2: Invoke /recommend endpoint with the English query
      setStepMessage('Querying BIS Standards catalogue and ranking specifications...');
      const { standards: results, isDemoFallback: fellBack, confidenceSignal: signal, confidenceBand: band, abstained: gateAbstained, abstainReason: reason } =
        await fetchRecommendations(effectiveQuery, config);
      setStandards(results);
      setIsDemoFallback(fellBack);
      setConfidenceSignal(signal);
      setConfidenceBand(band);
      setAbstained(gateAbstained);
      setAbstainReason(reason ?? null);

    } catch (err: any) {
      console.error('Error in recommendation pipeline:', err);
      setErrorMessage(err.message || 'Failed to communicate with backend service');
      setIsDemoFallback(false);
      setAbstained(false);
      setAbstainReason(null);
      setConfidenceBand('high');
    } finally {
      setIsLoading(false);
      setIsTranslating(false);
      setStepMessage('');
    }
  };

  const handleReset = () => {
    setQuery('');
    setStandards(null);
    setIsDemoFallback(false);
    setAbstained(false);
    setAbstainReason(null);
    setConfidenceBand('high');
    setErrorMessage(null);
    setTranslationInfo(null);
  };

  const handleTrySample = (sample: string) => {
    setQuery(sample);
    setSelectedLanguage('en');
    setStandards(null);
    setIsDemoFallback(false);
    setAbstained(false);
    setAbstainReason(null);
    setConfidenceBand('high');
    setErrorMessage(null);
  };

  const handleMapStateSelected = (state: string) => {
    setLabsSelectedState(state);
    setActiveTab('labs');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-uber-gray50 text-uber-black">
      
      {/* Top Header with Manak Mitra branding and tab nav */}
      <Header
        currentLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        config={config}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isBackendOnline={isBackendOnline}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenMapModal={() => setIsMapOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* === TAB: STANDARDS RECOMMENDER === */}
        {activeTab === 'standards' && (
          <>
            {/* Government Procurement Context Notice */}
            <div className="mb-6 bg-uber-white border-l-4 border-uber-black p-4 rounded-r-xl flex items-start justify-between gap-4 text-sm text-uber-black shadow-base">
              <div className="flex items-start gap-3">
                <Scale className="w-5 h-5 text-uber-black mt-0.5 shrink-0" />
                <div>
                  <span className="font-extrabold">Public Procurement Advisory:</span>
                  {' '}Under the Public Procurement (Preference to Make in India) Order and BIS Act 2016, all Central Ministries, CPSEs, and GeM buyers are required to reference applicable Indian Standards (IS) and mandatory Quality Control Orders (QCO) in technical tenders.
                </div>
              </div>
              <span className="hidden md:inline-block text-xs font-bold font-mono text-uber-black bg-uber-gray100 px-2.5 py-1 rounded-md border border-uber-gray300 shrink-0">
                Govt. of India
              </span>
            </div>

            {/* Specification Input */}
            <SpecificationInput
              query={query}
              onQueryChange={setQuery}
              onGetRecommendations={handleGetRecommendations}
              isLoading={isLoading}
              stepMessage={stepMessage}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              translationInfo={translationInfo}
            />

            {/* Loading State */}
            {isLoading && (
              <LoadingState
                stepMessage={stepMessage}
                isTranslating={isTranslating}
              />
            )}

            {/* Error State */}
            {errorMessage && !isLoading && (
              <ErrorState
                error={errorMessage}
                baseUrl={config.baseUrl}
                onRetry={handleGetRecommendations}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}

            {/* Empty State: No strong matches found */}
            {!isLoading && !errorMessage && standards !== null && standards.length === 0 && (
              <EmptyState
                query={submittedQuery}
                onReset={handleReset}
                onTrySample={handleTrySample}
              />
            )}

            {/* Results View: Ranked recommended standards */}
            {!isLoading && !errorMessage && standards !== null && standards.length > 0 && (
              <ResultsList
                standards={standards}
                query={submittedQuery}
                onNavigateToLabs={() => setActiveTab('labs')}
                isDemoFallback={isDemoFallback}
                abstained={abstained}
                abstainReason={abstainReason}
                confidenceSignal={confidenceSignal}
                confidenceBand={confidenceBand}
              />
            )}

            {/* Initial Welcome — shown when no search done yet */}
            {!isLoading && !errorMessage && standards === null && (
              <div className="my-10">
                
                {/* Big intro section — asymmetric split (left text / right stats) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="flex flex-col justify-center">
                    <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-uber-gray600 mb-3">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Bureau of Indian Standards</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-uber-black leading-snug tracking-tight mb-3">
                      Identify Mandatory IS Standards for Your Procurement
                    </h2>
                    <p className="text-sm sm:text-base text-uber-gray700 leading-relaxed">
                      Enter your tender specification, GeM product description, or engineering parameters above. The Manak Mitra engine cross-references the BIS technical catalogue and returns ranked Indian Standards with certification requirements and regulatory mandates.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 content-start">
                    <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 p-5 shadow-base">
                      <div className="text-3xl font-extrabold text-uber-black font-mono">431</div>
                      <div className="text-sm font-bold text-uber-gray700 mt-1">BIS Recognized Labs</div>
                      <div className="text-xs text-uber-gray500 mt-0.5">across 24 states · Source: BIS LIMS directory</div>
                    </div>
                    <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 p-5 shadow-base">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold text-uber-black font-mono">{corpusSize ?? '—'}</span>
                        <span className="text-sm text-uber-gray500 font-mono">/ 22K+</span>
                      </div>
                      <div className="text-sm font-bold text-uber-gray700 mt-1">Indexed by ManakMitra</div>
                      <div className="text-xs text-uber-gray500 mt-0.5">of the full BIS catalogue (22K+ standards)</div>
                    </div>
                    <div className="bg-uber-black text-white rounded-xl border-2 border-uber-black p-5 shadow-base">
                      <div className="text-3xl font-extrabold text-white font-mono">3+</div>
                      <div className="text-sm font-bold text-uber-gray300 mt-1">QCO Mandate Types</div>
                      <div className="text-xs text-uber-gray500 mt-0.5">ISI, CRS, Hallmarking</div>
                    </div>
                    <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 p-5 shadow-base">
                      <div className="text-3xl font-extrabold text-uber-black font-mono">8</div>
                      <div className="text-sm font-bold text-uber-gray700 mt-1">Languages Supported</div>
                      <div className="text-xs text-uber-gray500 mt-0.5">supported for input</div>
                    </div>
                  </div>
                </div>

                {/* Feature row — vertical dividers, no cards */}
                <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 shadow-base overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-uber-gray200">
                    
                    <div className="p-6">
                      <div className="w-8 h-8 rounded-lg bg-uber-black flex items-center justify-center text-white font-extrabold text-sm mb-3">
                        1
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-uber-black mb-1.5">
                        Multi-Lingual Specifications
                      </h3>
                      <p className="text-sm text-uber-gray700 leading-relaxed">
                        Paste tender BoQ lines in English, Hindi, or 6 other Indian state languages. Automatic translation preserves technical domain vocabulary for accurate indexing.
                      </p>
                    </div>

                    <div className="p-6">
                      <div className="w-8 h-8 rounded-lg bg-uber-black flex items-center justify-center text-white font-extrabold text-sm mb-3">
                        2
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-uber-black mb-1.5">
                        Conformity &amp; QCO Mandates
                      </h3>
                      <p className="text-sm text-uber-gray700 leading-relaxed">
                        Instantly identify whether a standard falls under BIS ISI Product Certification, Compulsory Registration Scheme (CRS), or Hallmarking — with source citations.
                      </p>
                    </div>

                    <div className="p-6">
                      <div className="w-8 h-8 rounded-lg bg-uber-black flex items-center justify-center text-white font-extrabold text-sm mb-3">
                        3
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-uber-black mb-1.5">
                        Allied &amp; Normative Network
                      </h3>
                      <p className="text-sm text-uber-gray700 leading-relaxed">
                        Explore connected test methods, safety codes, installation standards, and normative references — grouped by engineering relationship type.
                      </p>
                    </div>

                  </div>
                </div>

              </div>
            )}
          </>
        )}

        {/* === TAB: BIS LABS SEARCH === */}
        {activeTab === 'labs' && (
          <LabsSearch
            onOpenMapModal={() => setIsMapOpen(true)}
            selectedStateFromMap={labsSelectedState}
            onClearStateSelection={() => setLabsSelectedState(undefined)}
          />
        )}

        {/* === TAB: TENDER AUDIT === */}
        {activeTab === 'audit' && <TenderAuditView />}

      </main>

      {/* Footer */}
      <footer className="bg-uber-black border-t border-uber-gray800 mt-auto py-6 text-sm text-uber-gray500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 flex-wrap justify-center sm:justify-start">
            <span className="font-extrabold text-white text-base">Manak Mitra</span>
            <span className="text-uber-gray700">|</span>
            <span className="font-semibold text-uber-gray400">Bureau of Indian Standards (BIS)</span>
            <span className="text-uber-gray700">|</span>
            <span className="text-uber-gray500">AI Standards &amp; Laboratory Intelligence</span>
          </div>

          <div className="flex items-center space-x-4 text-uber-gray600 text-xs">
            <span className="font-mono">
              Service: <code className="text-uber-gray400 font-mono">{config.baseUrl}</code>
            </span>
            <span>•</span>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="text-uber-gray400 hover:text-white underline font-semibold cursor-pointer"
            >
              Configure
            </button>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onStatusChange={(isAlive) => setIsBackendOnline(isAlive)}
      />

      {/* Interactive India Map Modal */}
      <LabsMapPanel
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onStateClick={handleMapStateSelected}
      />

    </div>
  );
};

export default App;
