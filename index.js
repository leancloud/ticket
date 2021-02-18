import React from 'react'
import { render } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import I18nProvider, {locale} from './modules/i18n/I18nProvider'
import App from './modules/App'

render((
  <I18nProvider locale={locale}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </I18nProvider>
), document.getElementById('app'))
