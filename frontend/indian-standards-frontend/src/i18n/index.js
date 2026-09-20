// src/i18n/index.js
import en from './locales/en.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import bn from './locales/bn.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';

export const LOCALES = {
  en,
  hi,
  ta,
  te,
  bn,
  mr,
  gu,
  kn,
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native_name: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)', native_name: 'हिन्दी (Hindi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)', native_name: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)', native_name: 'తెలుగు (Telugu)' },
  { code: 'bn', label: 'বাংলা (Bengali)', native_name: 'বাংলা (Bengali)' },
  { code: 'mr', label: 'मराठी (Marathi)', native_name: 'मराठी (Marathi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)', native_name: 'ગુજરાતી (Gujarati)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', native_name: 'ಕನ್ನಡ (Kannada)' },
];

export function getDictionary(lang = 'en') {
  return LOCALES[lang] || LOCALES.en;
}
