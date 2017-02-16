import React from 'react'
import { Route, IndexRoute } from 'react-router'
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
    <Route path="/profile" component={Profile}/>
    <Route path="/settings" component={Settings}>
      <Route path="/settings/profile" component={SettingsProfile} />
      <Route path="/settings/members" component={Members} />
    </Route>
  </Route>
)
