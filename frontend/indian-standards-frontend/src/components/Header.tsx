import React from 'react';
import { Settings, Globe, ShieldCheck, Compass, FlaskConical, MapPin, ClipboardCheck } from 'lucide-react';
import { Language, ApiConfig } from '../types/standards';
import { SUPPORTED_LANGUAGES } from '../services/mockData';

interface HeaderProps {
  currentLanguage: string;
  onLanguageChange: (langCode: string) => void;
  config: ApiConfig;
  onOpenSettings: () => void;
  isBackendOnline: boolean | null;
  activeTab: 'standards' | 'labs' | 'audit';
  onTabChange: (tab: 'standards' | 'labs' | 'audit') => void;
  onOpenMapModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  config,
  onOpenSettings,
  isBackendOnline,
  activeTab,
  onTabChange,
  onOpenMapModal,
}) => {
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="bg-uber-white border-b border-uber-gray200 sticky top-0 z-40">
      {/* Top tricolor bar - Saffron, White, Green subtle Gov accent */}
      <div className="h-1 w-full flex">
        <div className="h-full w-1/3 bg-[#FF9933]"></div>
        <div className="h-full w-1/3 bg-white border-y border-uber-gray200"></div>
        <div className="h-full w-1/3 bg-[#138808]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 md:h-20 gap-3">
          
          {/* Logo & Portal Identification */}
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-lg bg-uber-black flex items-center justify-center text-white shadow-base border border-uber-gray700 shrink-0">
              <div className="flex flex-col items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-uber-white" />
                <span className="text-[10px] font-black tracking-widest text-uber-white uppercase -mt-0.5">BIS</span>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-uber-black tracking-tight flex items-center gap-2">
                  <span>Bureau of Indian Standards</span>
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-uber-gray100 text-uber-black rounded-md border border-uber-gray300">
                  AI Standards Recommender
                </span>
                <span className="px-2 py-0.5 text-xs font-extrabold bg-uber-black text-white rounded-md tracking-wide">
                  MANAK MITRA
                </span>
              </div>
              <p className="text-xs sm:text-sm text-uber-gray700 font-medium flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-uber-black">मानक मित्र • Your Standards Companion for Public Procurement</span>
                <span className="hidden sm:inline text-uber-gray400">•</span>
                <span className="hidden sm:inline text-uber-gray600">National Standards &amp; Lab Intelligence</span>
              </p>
            </div>
          </div>

          {/* Right Header Actions & Navigation Tabs */}
          <div className="flex items-center justify-between md:justify-end gap-2.5 flex-wrap">
            
            {/* Primary Navigation Tabs */}
            <div className="inline-flex p-1 bg-uber-gray100 rounded-lg border border-uber-gray200 text-xs sm:text-sm font-semibold">
              <button
                onClick={() => onTabChange('standards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'standards'
                    ? 'bg-uber-black text-white shadow-base'
                    : 'text-uber-gray700 hover:text-uber-black hover:bg-uber-white'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Standards Search</span>
              </button>

              <button
                onClick={() => onTabChange('labs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'labs'
                    ? 'bg-uber-black text-white shadow-base'
                    : 'text-uber-gray700 hover:text-uber-black hover:bg-uber-white'
                }`}
                title="Source: BIS LIMS lab directory"
              >
                <FlaskConical className="w-4 h-4" />
                <span>BIS Labs (431)</span>
              </button>

              <button
                onClick={() => onTabChange('audit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-uber-black text-white shadow-base'
                    : 'text-uber-gray700 hover:text-uber-black hover:bg-uber-white'
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Tender Audit</span>
              </button>
            </div>

            {/* Quick Map Button */}
            <button
              onClick={onOpenMapModal}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-uber-white hover:bg-uber-gray100 text-uber-black rounded-lg border border-uber-gray300 text-xs font-semibold transition-colors cursor-pointer"
              title="Open India Interactive Laboratories Map"
            >
              <MapPin className="w-3.5 h-3.5 text-uber-blue" />
              <span>Map View</span>
            </button>

            {/* Language Selector */}
            <div className="relative flex items-center">
              <div className="flex items-center bg-uber-white hover:bg-uber-gray50 border border-uber-gray300 rounded-lg px-2.5 py-1.5 transition-colors">
                <Globe className="w-4 h-4 text-uber-gray600 mr-1.5 shrink-0" />
                <select
                  value={currentLanguage}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-uber-black focus:outline-none cursor-pointer pr-1"
                  aria-label="Select specification language"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Backend Connectivity Status Pill (No longer says demo/mock) */}
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border border-uber-gray300 text-xs font-medium bg-uber-white hover:bg-uber-gray50 text-uber-black transition-all cursor-pointer"
              title="Service Configuration & API Settings"
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isBackendOnline === true ? 'bg-uber-green' : 'bg-uber-blue'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isBackendOnline === true ? 'bg-uber-green' : 'bg-uber-blue'
                  }`}
                ></span>
              </span>
              <span className="font-semibold hidden sm:inline">
                {isBackendOnline === true ? 'Live Service' : 'Active Engine'}
              </span>
            </button>

            {/* Settings Gear */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-uber-gray700 hover:text-uber-black hover:bg-uber-gray100 rounded-lg border border-uber-gray300 transition-colors cursor-pointer"
              aria-label="API Settings"
              title="Configure API Base URL & Endpoints"
            >
              <Settings className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
