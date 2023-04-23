import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import zhCN from './locales/zh-cn.json';
import zhHK from './locales/zh-hk.json';
import zhTW from './locales/zh-tw.json';
import en from './locales/en.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import id from './locales/id.json';
import th from './locales/th.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import tr from './locales/tr.json';
import vi from './locales/vi.json';
import it from './locales/it.json';

const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'zh-HK': {
    translation: zhHK,
  },
  'zh-TW': {
    translation: zhTW,
  },
  en: {
    translation: en,
  },
  ko: {
    translation: ko,
  },
  ja: {
    translation: ja,
  },
  id: {
    translation: id,
  },
  th: {
    translation: th,
  },
  de: {
    translation: de,
  },
  fr: {
    translation: fr,
  },
  ru: {
    translation: ru,
  },
  es: {
    translation: es,
  },
  pt: {
    translation: pt,
  },
  tr: {
    translation: tr,
  },
  vi: {
    translation: vi,
  },
  it: {
    translation: it,
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
