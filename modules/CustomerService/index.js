import React from 'react'
import { Route, Switch, useRouteMatch } from 'react-router-dom'

import CSTickets from './Tickets'

export { useCustomerServices } from './useCustomerServices'

export default function CustomerService(props) {
  const { path } = useRouteMatch()

  return (
    <Switch>
      <Route path={`${path}/tickets`}>
        <CSTickets />
      </Route>
    </Switch>
  )
}
