import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import zh from './locales/zh.json';
import en from './locales/en.json';
import ko from './locales/ko.json';
import jp from './locales/jp.json';

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
  jp: {
    translation: jp,
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
    detection: {
      order: ['querystring', 'navigator', 'htmlTag', 'cookie', 'sessionStorage', 'localStorage'],
      lookupQuerystring: 'lang',
    },
  });

export default i18n;
