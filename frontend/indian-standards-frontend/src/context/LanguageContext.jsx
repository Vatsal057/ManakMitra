import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

// Fallback list used whenever GET /i18n/languages is unavailable — the
// endpoint "may or may not exist" per the API contract.
const FALLBACK_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
];

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
  const [language, setLanguage] = useState('en');
  const [fetchedStrings, setFetchedStrings] = useState(null);

  useEffect(() => {
    apiClient.getLanguages().then((data) => {
      if (data?.languages?.length) setLanguages(data.languages);
    });
  }, []);

  useEffect(() => {
    if (language === 'en') return;
    let cancelled = false;
    apiClient.getI18n(language).then((data) => {
      if (!cancelled) setFetchedStrings(data);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  // English never needs fetched strings, even if a previous language's
  // fetch is still resolving.
  const uiStrings = language === 'en' ? null : fetchedStrings;

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languages,
      // Falls back to the English literal for any missing key — a button
      // showing English text is acceptable, a blank button is not.
      t: (key, englishFallback) => uiStrings?.[key] ?? englishFallback,
    }),
    [language, languages, uiStrings]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
