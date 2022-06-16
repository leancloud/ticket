import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ArrayParam, decodeQueryParams, JsonParam, StringParam } from 'serialize-query-params';
import { parse } from 'query-string';
import { Helmet, HelmetProvider } from 'react-helmet-async';

import { User, auth as lcAuth } from '@/leancloud';
import { APIError } from '@/components/APIError';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loading } from '@/components/Loading';
import LogIn from './LogIn';
import Home from './Home';
import Categories from './Categories';
import Tickets from './Tickets';
import NotFound from './NotFound';
import Articles from './Articles';
import { useTranslation } from 'react-i18next';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function RequireAuth({ children }: { children: JSX.Element }) {
  const [auth, loading, error] = useAuth();
  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <APIError onRetry={() => location.reload()} />;
  }
  if (!auth) {
    return <LogIn />;
  }
  return children;
}

const RootCategoryContext = createContext<string | undefined>(undefined);
export const useRootCategory = () => useContext(RootCategoryContext);

const ROOT_URLS = ['/in-app/v1/categories', '/in-app/v1/products'];

const TicketInfoContext = createContext<{
  meta?: Record<string, unknown> | null;
  tags?: Array<string | null> | null;
  // fields
}>({});
export const useTicketInfo = () => useContext(TicketInfoContext);

const AuthContext = createContext<[User | null, boolean, any]>([null, true, null]);
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const { t } = useTranslation();

  const pathname = window.location.pathname;
  const paths = pathname.split('/');
  const rootCategory = paths[4];

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

  const rootURL = ROOT_URLS.find((URL) => pathname.startsWith(URL));
  if (!rootURL) {
    return <p>Not Found</p>;
  }
  return (
    <HelmetProvider>
      <Helmet>
        <title>{t('general.call_center')}</title>
      </Helmet>
      <BrowserRouter basename={`${rootURL}/${paths[4]}`}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <RootCategoryContext.Provider value={rootCategory}>
              <AuthContext.Provider value={auth}>
                <TicketInfoContext.Provider value={ticketInfo}>
                  <AppRoutes />
                </TicketInfoContext.Provider>
              </AuthContext.Provider>
            </RootCategoryContext.Provider>
          </ErrorBoundary>
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LogIn />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/tickets/*"
        element={
          <RequireAuth>
            <Tickets />
          </RequireAuth>
        }
      />
      <Route
        path="/categories/:id"
        element={
          <RequireAuth>
            <Categories />
          </RequireAuth>
        }
      />
      <Route path="/articles/*" element={<Articles />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
