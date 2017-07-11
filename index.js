import React from 'react'
import { anchorate } from 'anchorate'
import { render } from 'react-dom'
import { Router, browserHistory } from 'react-router'

import routes from './modules/routes'

function onUpdate () {
  anchorate()
}

render((
  <Router routes={routes} history={browserHistory} onUpdate={onUpdate} />
), document.getElementById('app'))
