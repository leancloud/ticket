import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ArrayParam, decodeQueryParams, JsonParam, StringParam } from 'serialize-query-params';
import { parse } from 'query-string';

import { User, auth as lcAuth } from 'leancloud';
import { APIError } from 'components/APIError';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { Loading } from 'components/Loading';
import LogIn from './LogIn';
import Home from './Home';
import Categories from './Categories';
import Tickets from './Tickets';
import NotFound from './NotFound';
import Articles from './Articles';

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
    return <APIError onRetry={() => location.reload()} />;
  }
  if (!auth) {
    return <Redirect to="/login" />;
  }
  return <Route {...props} />;
}

const RootCategoryContext = createContext<string | undefined>(undefined);
export const useRootCategory = () => useContext(RootCategoryContext);

const ROOT_URL = '/in-app/v1/categories';

const TicketInfoContext = createContext<{
  meta?: Record<string, unknown> | null;
  tags?: Array<string | null> | null;
  // fields
}>({});
export const useTicketInfo = () => useContext(TicketInfoContext);

const AuthContext = createContext<[User | null, boolean, any]>([null, true, null]);
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const pathname = window.location.pathname;
  const paths = pathname.split('/');
  const rootCategory = paths[4] === '-' ? undefined : paths[4];

  const params = useMemo(
    () =>
      decodeQueryParams(
        { meta: JsonParam, tags: ArrayParam, auth: JsonParam, 'anonymous-id': StringParam },
        parse(window.location.hash)
      ),
    []
  );
  const ticketInfo = useMemo(() => ({ meta: params.meta, tags: params.tags }), [params]);

  const [auth, setAuth] = useState<[User | null, boolean, any]>([null, true, null]);
  useEffect(() => {
    if (params['anonymous-id']) {
      lcAuth
        .loginWithAuthData('anonymous', { id: params['anonymous-id'] })
        .then((user) => setAuth([user, false, null]))
        .catch((error) => setAuth([null, false, error]));
    } else if (params.auth) {
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

  if (!pathname.startsWith(ROOT_URL)) {
    return <>'Not Found'</>;
  }
  return (
    <BrowserRouter basename={`${ROOT_URL}/${paths[4]}`}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <RootCategoryContext.Provider value={rootCategory}>
            <AuthContext.Provider value={auth}>
              <TicketInfoContext.Provider value={ticketInfo}>
                <Routes />
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
      <Route path="/articles">
        <Articles />
      </Route>
      <PrivateRoute path="/" exact>
        <Home />
      </PrivateRoute>
      <Route path="/">
        <NotFound />
      </Route>
    </Switch>
  );
};
