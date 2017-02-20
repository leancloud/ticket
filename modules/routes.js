import React from 'react'
import { Route, IndexRoute } from 'react-router'
import moment from 'moment'
import AV from 'leancloud-storage'

import common from './common'
import App from './App'
import About from './About'
import Login from './Login'
import Profile from './Profile'
import Tickets from './Tickets'
import NewTicket from './NewTicket'
import Ticket from './Ticket'
import Home from './Home'
import Settings from './Settings'
import SettingsProfile from './settings/Profile'
import Members from './settings/Members'
import Categories from './settings/Categories'
import Error from './Error'

moment.locale('zh-cn')

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
})

module.exports = (
  <Route path="/" component={App}>
    <IndexRoute component={Home}/>
    <Route path="/tickets" component={Tickets}>
      <Route path="/tickets/new" component={NewTicket} />
      <Route path="/tickets/:nid" component={Ticket}>
      </Route>
    </Route>
    <Route path="/about" component={About}/>
    <Route path="/login" component={Login}/>
    <Route path="/profile" component={Profile} />
    <Route path="/settings" component={Settings} onEnter={common.requireAuth}>
      <Route path="/settings/profile" component={SettingsProfile} />
      <Route path="/settings/members" component={Members} />
      <Route path="/settings/categories" component={Categories} />
    </Route>
    <Route path="/error" component={Error} />
  </Route>
)
