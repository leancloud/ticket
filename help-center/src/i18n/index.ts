import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import zhCN from './locales/zh-cn.json';
import en from './locales/en.json';

const resources = {
  'zh-CN': {
    translation: zhCN,
  },

  en: {
    translation: en,
  },
};

const languageDetector = new LanguageDetector();

const querystringOrNavigator = {
  name: 'querystring-or-navigator',

  lookup(options: ConstructorParameters<typeof LanguageDetector>['1']) {
    const querystring = languageDetector.detectors['querystring'].lookup(options) as
      | string[]
      | undefined;

    return querystring?.length
      ? querystring
      : languageDetector.detectors['navigator'].lookup(options);
  },
};

languageDetector.addDetector(querystringOrNavigator);

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: ['en'],
    supportedLngs: Object.keys(resources),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring-or-navigator'],
      lookupQuerystring: 'lang',
      caches: [],
    },
  });

export default i18n;
