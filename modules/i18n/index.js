import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import moment from 'moment'
import 'moment/locale/zh-cn'
import locales from './locales'

const defaultLocale = window.navigator.language.slice(0, 2) === 'zh' ? 'zh' : 'en'
const userLocale = window.localStorage.getItem('locale')
export const locale = userLocale || defaultLocale

moment.updateLocale('zh-cn', {
  /* eslint-disable i18n/no-chinese-character */
  calendar: {
    lastWeek: function (now) {
      if (this.week() === now.week()) {
        return 'ddddLT'
      } else {
        return '[上]ddddLT'
      }
    },
  },
  /* eslint-enable i18n/no-chinese-character */
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
  keySeparator: false,
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
