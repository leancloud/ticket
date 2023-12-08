import { Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { decodeQueryParams, JsonParam } from 'serialize-query-params';
import { parse } from 'query-string';
import { Helmet, HelmetProvider } from 'react-helmet-async';

import { http } from '@/leancloud';
import {
  loginByAnonymousId,
  loginByCurrentUser,
  loginByJWT,
  loginByLocalAnonymousId,
  loginByTDSCredential,
  loginByXDAccessToken,
  useAutoLogin,
} from '@/auth';
import { useAuth } from '@/states/auth';
import { useSetRootCategory } from '@/states/root-category';
import { useSetTicketInfo } from '@/states/ticket-info';
import { useCategory } from '@/api/category';
import { SDKProvider } from '@/components/SDK';
import { APIError } from '@/components/APIError';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loading } from '@/components/Loading';
import LogIn from './LogIn';
import Home from './Home';
import Categories, { Preview } from './Categories';
import Tickets from './Tickets';
import NotFound from './NotFound';
import Articles from './Articles';
import TopCategories from './TopCategories';
import Test from './Test';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, error } = useAuth();

  useAutoLogin({
    strategies: [loginByLocalAnonymousId],
  });

  if (loading) {
    return <Loading fullScreen />;
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
  const { t, i18n } = useTranslation();

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
  const rootCategoryId = paths[4];

  const setRootCategory = useSetRootCategory();
  const setTicketInfo = useSetTicketInfo();

  const params = useHashConfiguration();

  useEffect(() => {
    setTicketInfo({
      meta: params.meta,
      fields: params.fields,
    });
  }, []);

  useAutoLogin({
    strategies: [
      loginByAnonymousId,
      loginByXDAccessToken,
      loginByTDSCredential,
      loginByJWT,
      loginByCurrentUser,
    ],
  });

  const { data: rootCategory, isLoading: loadingRootCategory } = useCategory(rootCategoryId, {
    enabled: rootCategoryId !== undefined,
  });
  useEffect(() => {
    if (rootCategory) {
      setRootCategory(rootCategory);
      http.defaults.headers.common['x-product'] = rootCategory.id;
    }
  }, [rootCategory]);

  const rootURL = ROOT_URLS.find((URL) => pathname.startsWith(URL));
  if (!rootURL || (!loadingRootCategory && !rootCategory)) {
    return <p>Not Found</p>;
  }
  return (
    <HelmetProvider>
      <Helmet>
        <html lang={i18n.language} />
        <title>{t('general.call_center')}</title>
      </Helmet>
      <BrowserRouter basename={`${rootURL}/${rootCategoryId}`}>
        <ErrorBoundary>
          <Suspense fallback={<Loading fullScreen />}>
            <SDKProvider>
              <AppRoutes />
            </SDKProvider>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  );
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/test" element={<Test />} />
      <Route path="/login" element={<LogIn />} />
      <Route path="/" element={<Home />} />
      <Route
        path="/tickets/*"
        element={
          <RequireAuth>
            <Tickets />
          </RequireAuth>
        }
      />
      <Route path="/categories/:id" element={<Categories />} />
      <Route path="/categories/preview" element={<Preview />} />
      <Route path="/categories" element={<TopCategories />} />
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
        },
        parse(window.location.hash)
      ),
    []
  );
}
