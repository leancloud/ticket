import React from 'react'
import { Route, Switch, useRouteMatch } from 'react-router-dom'

import CSTickets from './CustomerServiceTickets'
import CSStats from './CustomerServiceStats'
import CSStatsUser from './CustomerServiceStats/User'

export default function CustomerService(props) {
  const { path } = useRouteMatch()

  return (
    <Switch>
      <Route path={`${path}/tickets`}>
        <CSTickets {...props} />
      </Route>
      <Route path={`${path}/stats`} exact>
        <CSStats {...props} />
      </Route>
      <Route path={`${path}/stats/users/:userId`}>
        <CSStatsUser {...props} />
      </Route>
    </Switch>
  )
}
