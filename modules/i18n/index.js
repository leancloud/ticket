import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import moment from 'moment'
import 'moment/locale/zh-cn'
import locales from './locales'

const defaultLocale = window.navigator.language.slice(0, 2) === 'zh' ? 'zh' : 'en'
const userLocale = window.localStorage.getItem('locale')
export const locale = userLocale || defaultLocale

moment.updateLocale('zh-cn', {
  calendar: {
    // eslint-disable-next-line i18n/no-chinese-character
    lastWeek: '[上]ddddLT',
  },
})

i18next.on('languageChanged', (lang) => {
  if (lang === 'zh') {
    moment.locale('zh-cn')
  } else {
    moment.locale('en')
  }
})

i18next.use(initReactI18next).init({
  lng: locale,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    zh: {
      translation: locales.zh,
    },
    en: {
      translation: locales.en,
    },
  },
})
