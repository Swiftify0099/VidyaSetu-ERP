import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import mr from './mr.json';
import en from './en.json';

i18n.use(initReactI18next).init({
  resources: {
    mr: { translation: mr },
    en: { translation: en },
  },
  lng: localStorage.getItem('vidyasetu_lang') || import.meta.env.VITE_DEFAULT_LANGUAGE || 'mr',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
