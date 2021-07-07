import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import zh from './locales/zh.json';
import en from './locales/en.json';
import ko from './locales/ko.json';

const resources = {
  zh: {
    translation: zh,
  },
  en: {
    translation: en,
  },
  ko: {
    translation: ko,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: ['en', 'zh'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
