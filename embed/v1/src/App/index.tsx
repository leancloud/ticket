import { useState } from 'react';
import { createContext } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { ControlButton } from 'components/ControlButton';
import LogIn from './LogIn';
import Home from './Home';
import Categories from './Categories';
import Tickets from './Tickets';

export interface IAppContext {
  currentUser?: {
    username: string;
    sessionToken: string;
  };
}

export const AppContext = createContext<IAppContext>({});

function PrivateRoute() {}

export default function App() {
  const [context, setContext] = useState<IAppContext>({});
  return (
    <AppContext.Provider value={context}>
      <div className="h-full px-36 py-5">
        <ControlButton />
        <Switch>
          <Route path="/tickets">
            <Tickets />
          </Route>
          <Route path="/home">
            <Home />
          </Route>
          <Route path="/login">
            <LogIn />
          </Route>
          <Route path="/categories/:id">
            <Categories />
          </Route>
          <Route path="/tickets">
            <Tickets />
          </Route>
          <Redirect to="/home" />
        </Switch>
      </div>
    </AppContext.Provider>
  );
}
