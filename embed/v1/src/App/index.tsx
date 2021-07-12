import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';

import { auth } from 'leancloud';
import { ControlButton } from 'components/ControlButton';
import LogIn from './LogIn';
import Home from './Home';
import Categories from './Categories';
import Tickets from './Tickets';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from 'react-query';
import { parse } from 'query-string';
import { decodeQueryParams, JsonParam } from 'serialize-query-params';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function PrivateRoute(props: PropsWithChildren<{ path: string; exact?: boolean }>) {
  if (!auth.currentUser) {
    return <Redirect to="/login" />;
  }
  return <Route {...props} />;
}

const RootCategoryContext = createContext<string | undefined>(undefined);
export const useRootCategory = () => useContext(RootCategoryContext);

const ROOT_URL = '/embed/v1/catogeries';

const NotFound = () => <>NOT FOUND</>;

export default function App() {
  const pathname = window.location.pathname;
  console.log(pathname);
  if (!pathname.startsWith(ROOT_URL)) return <NotFound />;
  const paths = pathname.split('/');
  const rootCategory = paths[4] === '-' ? undefined : paths[4];

  return (
    <BrowserRouter basename={`${ROOT_URL}/${paths[4]}`}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <RootCategoryContext.Provider value={rootCategory}>
            <div className="h-full p-4 sm:px-24 pt-14 sm:pt-4">
              <ControlButton />
              <Routes />
            </div>
          </RootCategoryContext.Provider>
        </ErrorBoundary>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

const TicketContext = createContext<object>({});
export const useTicketContext = () => useContext(TicketContext);

const Routes = () => {
  const ticketContext = useMemo(
    () => decodeQueryParams({ meta: JsonParam, auth: JsonParam }, parse(window.location.hash)),
    []
  );

  console.log(ticketContext);

  return (
    <TicketContext.Provider value={ticketContext}>
      <Switch>
        <Route path="/login">
          <LogIn />
        </Route>
        <PrivateRoute path="/tickets">
          <Tickets />
        </PrivateRoute>
        <PrivateRoute path="/categories/:id">
          <Categories />
        </PrivateRoute>
        <PrivateRoute path="/tickets">
          <Tickets />
        </PrivateRoute>
        <PrivateRoute path="/" exact>
          <Home />
        </PrivateRoute>
        <Route path="*">
          <NotFound />
        </Route>
      </Switch>
    </TicketContext.Provider>
  );
};
