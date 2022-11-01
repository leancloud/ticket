import { Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useTranslation } from 'react-i18next';
import { decodeQueryParams, JsonParam, StringParam } from 'serialize-query-params';
import { parse } from 'query-string';
import { Helmet, HelmetProvider } from 'react-helmet-async';

import { auth as lcAuth, http } from '@/leancloud';
import { useAuth, useSetAuth } from '@/states/auth';
import { useSetRootCategory } from '@/states/root-category';
import { useSetTicketInfo } from '@/states/ticket-info';
import { SDKProvider } from '@/components/SDK';
import { APIError } from '@/components/APIError';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loading } from '@/components/Loading';
import LogIn from './LogIn';
import Home from './Home';
import Categories from './Categories';
import Tickets from './Tickets';
import NotFound from './NotFound';
import Articles from './Articles';
import TopCategories from './TopCategories';
import Test from './Test';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, error } = useAuth();
  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <APIError error={error} onRetry={() => location.reload()} />;
  }
  if (!user) {
    return <LogIn />;
  }
  return children;
}

const ROOT_URLS = ['/in-app/v1/categories', '/in-app/v1/products'];

export default function App() {
  const { t } = useTranslation();

  useEffect(() => {
    const isRND =
      window.location.hostname.indexOf('rnd') !== -1 ||
      window.location.hostname.indexOf('stg') !== -1;
    if (isRND) {
      document.body.classList.add('rnd');
    }
  }, []);

  const pathname = window.location.pathname;
  const paths = pathname.split('/');
  const rootCategory = paths[4];

  const setAuth = useSetAuth();
  const setRootCategory = useSetRootCategory();
  const setTicketInfo = useSetTicketInfo();

  const params = useHashConfiguration();

  useEffect(() => {
    setRootCategory(rootCategory);
    setTicketInfo({
      meta: params.meta,
      fields: params.fields,
    });
  }, []);

  useEffect(() => {
    setAuth({ loading: true });
    if (params['anonymous-id']) {
      lcAuth
        .loginWithAuthData('anonymous', { id: params['anonymous-id'] })
        .then((user) => setAuth({ user }))
        .catch((error) => setAuth({ error }));
    } else if (params['xd-access-token'] || params['tds-credential']) {
      http
        .post(
          '/api/2/users',
          params['xd-access-token']
            ? { XDAccessToken: params['xd-access-token'] }
            : {
                type: 'tds-user',
                token: params['tds-credential'],
                associateAnonymousId: params['associate-anonymous-id'],
              }
        )
        .catch((error) => {
          if (error?.['response']?.['data']?.['message']) {
            throw new Error(error['response']['data']['message']);
          }
          throw error;
        })
        .then((response) => lcAuth.loginWithSessionToken(response.data.sessionToken))
        .then((user) => setAuth({ user }))
        .catch((error) => setAuth({ error }));
    } else if (lcAuth.currentUser) {
      setAuth({ user: lcAuth.currentUser });
    } else {
      setAuth({});
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
      <BrowserRouter basename={`${rootURL}/${rootCategory}`}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              <SDKProvider>
                <AppRoutes />
              </SDKProvider>
            </Suspense>
          </ErrorBoundary>
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/test" element={<Test />} />
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
      <Route path="/topCategories" element={<TopCategories />} />
      <Route path="/articles/*" element={<Articles />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function useHashConfiguration() {
  return useMemo(
    () =>
      decodeQueryParams(
        {
          meta: JsonParam,
          fields: JsonParam,
          'anonymous-id': StringParam,
          'xd-access-token': StringParam,
          'tds-credential': StringParam,
          'associate-anonymous-id': StringParam,
        },
        parse(window.location.hash)
      ),
    []
  );
}
