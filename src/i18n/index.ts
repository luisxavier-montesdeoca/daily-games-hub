import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';

function initialLang(): 'en' | 'es' {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    /* storage unavailable */
  }
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem('lang', lng);
  } catch {
    /* storage unavailable */
  }
});
document.documentElement.lang = i18n.language;

export default i18n;
