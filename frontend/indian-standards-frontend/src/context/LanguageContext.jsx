import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { LOCALES, SUPPORTED_LANGUAGES, getDictionary } from '../i18n';

const normalizeLanguages = (list) => {
  if (!Array.isArray(list)) return SUPPORTED_LANGUAGES;
  return list.map((l) => ({
    code: l.code,
    label: l.native_name || l.label || l.code,
    native_name: l.native_name || l.label || l.code,
  }));
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [languages, setLanguages] = useState(() => normalizeLanguages(SUPPORTED_LANGUAGES));
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('manakmitra_lang') || 'en';
    } catch {
      return 'en';
    }
  });
  const [serverStrings, setServerStrings] = useState({});

  const setLanguage = (newLang) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('manakmitra_lang', newLang);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    apiClient.getLanguages().then((data) => {
      if (data?.languages?.length) {
        setLanguages(normalizeLanguages(data.languages));
      }
    });
  }, []);

  useEffect(() => {
    if (language === 'en') return;
    let cancelled = false;
    apiClient.getI18n(language).then((data) => {
      if (!cancelled && data && typeof data === 'object') {
        setServerStrings((prev) => ({ ...prev, [language]: data }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const activeDict = useMemo(() => {
    const staticDict = getDictionary(language);
    if (language === 'en' || !serverStrings[language]) return staticDict;
    return { ...staticDict, ...serverStrings[language] };
  }, [language, serverStrings]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languages,
      // Translates key with fallback to English or provided fallback string
      t: (key, englishFallback) => {
        const val = activeDict?.[key];
        if (typeof val === 'string' && val.trim() !== '') return val;
        if (val && typeof val === 'object' && val.value) return val.value;
        const enVal = LOCALES.en?.[key];
        if (typeof enVal === 'string' && enVal.trim() !== '') return enVal;
        return englishFallback !== undefined ? englishFallback : key;
      },
    }),
    [language, languages, activeDict]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

