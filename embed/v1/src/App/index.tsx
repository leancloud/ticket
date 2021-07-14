import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

import { auth as lcAuth } from 'leancloud';
import { ControlButton } from 'components/ControlButton';
import { ErrorBoundary } from 'components/ErrorBoundary';
import LogIn from './LogIn';
import Home from './Home';
import Categories from './Categories';
import Tickets from './Tickets';
import { parse } from 'query-string';
import { ArrayParam, decodeQueryParams, JsonParam } from 'serialize-query-params';
import { User } from 'open-leancloud-storage/auth';
import { Loading } from 'components/Loading';
import { APIError } from 'components/APIError';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function PrivateRoute(props: PropsWithChildren<{ path: string; exact?: boolean }>) {
  const [auth, loading, error] = useAuth();
  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <APIError error={error} />;
  }
  if (!auth) {
    return <Redirect to="/login" />;
  }
  return <Route {...props} />;
}

const RootCategoryContext = createContext<string | undefined>(undefined);
export const useRootCategory = () => useContext(RootCategoryContext);

const ROOT_URL = '/embed/v1/categories';

const NotFound = () => <>NOT FOUND</>;

const TicketInfoContext = createContext<{
  meta?: Record<string, unknown> | null;
  tags?: Array<string | null> | null;
  // fields
}>({});
export const useTicketContext = () => useContext(TicketInfoContext);

const AuthContext = createContext<[User | null, boolean, any]>([null, true, null]);
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const pathname = window.location.pathname;
  if (!pathname.startsWith(ROOT_URL)) return <NotFound />;
  const paths = pathname.split('/');
  const rootCategory = paths[4] === '-' ? undefined : paths[4];

  const params = useMemo(
    () =>
      decodeQueryParams(
        { meta: JsonParam, tags: ArrayParam, auth: JsonParam },
        parse(window.location.hash)
      ),
    []
  );
  const ticketInfo = useMemo(() => ({ meta: params.meta, tags: params.tags }), [params]);

  const [auth, setAuth] = useState<[User | null, boolean, any]>([null, true, null]);
  useEffect(() => {
    if (params.auth) {
      if (!params.auth['platform']) {
        setAuth([null, false, new Error('Malformed auth param: platform is required')]);
        return;
      }
      lcAuth
        .loginWithAuthData(params.auth.platform, params.auth.data)
        .then((user) => setAuth([user, false, null]))
        .catch((error) => setAuth([null, false, error]));
    } else if (lcAuth.currentUser) {
      setAuth([lcAuth.currentUser, false, null]);
    } else {
      setAuth([null, false, null]);
    }
  }, []);

  return (
    <BrowserRouter basename={`${ROOT_URL}/${paths[4]}`}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <RootCategoryContext.Provider value={rootCategory}>
            <AuthContext.Provider value={auth}>
              <TicketInfoContext.Provider value={ticketInfo}>
                <div className="h-full p-4 sm:px-24 pt-14 sm:pt-4">
                  <ControlButton />
                  <Routes />
                </div>
              </TicketInfoContext.Provider>
            </AuthContext.Provider>
          </RootCategoryContext.Provider>
        </ErrorBoundary>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

const Routes = () => {
  return (
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
  );
};
