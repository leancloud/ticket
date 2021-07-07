import { PropsWithChildren, useContext, useState } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { auth } from 'leancloud';
import { ControlButton } from 'components/ControlButton';
import LogIn from './LogIn';
import Home from './Home';
import Categories from './Categories';
import Tickets from './Tickets';

function PrivateRoute(props: PropsWithChildren<{ path: string }>) {
  if (!auth.currentUser) {
    return <Redirect to="/login" />;
  }
  return <Route {...props} />;
}

export default function App() {
  return (
    <div className="h-full p-4 sm:px-24 pt-14 sm:pt-4">
      <ControlButton />
      <Switch>
        <Route path="/login">
          <LogIn />
        </Route>
        <PrivateRoute path="/tickets">
          <Tickets />
        </PrivateRoute>
        <PrivateRoute path="/home">
          <Home />
        </PrivateRoute>
        <PrivateRoute path="/categories/:id">
          <Categories />
        </PrivateRoute>
        <PrivateRoute path="/tickets">
          <Tickets />
        </PrivateRoute>
        <Redirect to="/home" />
      </Switch>
    </div>
  );
}
