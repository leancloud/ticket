import React from 'react'
import { anchorate } from 'anchorate'
import { render } from 'react-dom'
import { Router, browserHistory } from 'react-router'
import I18nProvider from './I18nProvider'

const locale = window.navigator.language.slice(0, 2) === 'zh' ? 'zh' : 'en'

import routes from './modules/routes'

function onUpdate () {
  anchorate()
}

render((
  <I18nProvider locale={locale}>
  <Router routes={routes} history={browserHistory} onUpdate={onUpdate} />
  </I18nProvider>
), document.getElementById('app'))
