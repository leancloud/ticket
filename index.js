import React from 'react'
import { render } from 'react-dom'
import { Router, browserHistory } from 'react-router'
import moment from 'moment'
import AV from 'leancloud-storage'

import routes from './modules/routes'

moment.locale('zh-cn');

const APP_ID = 'qJnLgVRA9mnzVSw4Ho3HtIaI-gzGzoHsz';
const APP_KEY = 'zWbsVPeSQtQOSy2bN3ixRVOq';
AV.init({
  appId: APP_ID,
  appKey: APP_KEY
});

render((
  <Router routes={routes} history={browserHistory}/>
), document.getElementById('app'))
