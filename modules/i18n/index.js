import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import moment from 'moment'
import 'moment/locale/ko'
import 'moment/locale/zh-cn'
import zh from './locales/zh.json'
import en from './locales/en.json'
import ko from './locales/ko.json'

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
  } else if (lang === 'ko') {
    moment.locale('ko')
  } else {
    moment.locale('en')
  }
})

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      zh: {
        translation: zh,
      },
      en: {
        translation: en,
      },
      ko: {
        translation: ko,
      },
    },
  })
