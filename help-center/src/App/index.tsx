import { Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { decodeQueryParams, JsonParam, StringParam } from 'serialize-query-params';
import { parse } from 'query-string';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useAuth, useSetAuth } from '@/states/auth';
import { getAnonymousId } from '@/utils/getAnonymousId';
import { auth as lcAuth, http } from '@/leancloud';
import { useSetRootCategory } from '@/states/root-category';

import { useCategory } from '@/api/category';
import { Loading } from '@/components/Loading';
import { Header } from '@/components/Header';

import Home from '@/App/Home';
import Article from '@/App/Article';
import Topic from '@/App/Topic';
import NotFound from '@/App/NotFound';
import Categories from '@/App/Categories';
import Tickets from '@/App/Tickets';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, error } = useAuth();
  if (loading) {
    return <Loading />;
  }
  // if (error) {
  //   return <APIError error={error} onRetry={() => location.reload()} />;
  // }
  // if (!user) {
  //   return <LogIn />;
  // }
  return children;
}

export default function App() {
  const { t, i18n } = useTranslation();

  const pathname = window.location.pathname;
  const paths = pathname.split('/');
  const rootCategoryId = paths[2];

  const setRootCategory = useSetRootCategory();

  const { data: rootCategory, isLoading: loadingRootCategory, error } = useCategory(
    rootCategoryId,
    {
      enabled: rootCategoryId !== undefined,
    }
  );
  const params = useHashConfiguration();
  const setAuth = useSetAuth();
  useEffect(() => {
    setAuth({ loading: true });

    if (lcAuth.currentUser) {
      setAuth({ user: lcAuth.currentUser });
      return;
    }

    const { from } = params;

    getAnonymousId({ from, productId: rootCategoryId }).then((anonymousId) => {
      http
        .post('/api/2/users', {
          type: 'anonymous',
          anonymousId: anonymousId,
        })
        .catch((error) => {
          if (error?.['response']?.['data']?.['message']) {
            throw new Error(error['response']['data']['message']);
          }
          throw error;
        })
        .then((response) => lcAuth.loginWithSessionToken(response.data.sessionToken))
        .then((user) => setAuth({ user }))
        .catch((error) => setAuth({ error }));
    });
  }, []);

  useEffect(() => {
    if (rootCategory) {
      setRootCategory(rootCategory);
      http.defaults.headers.common['x-product'] = rootCategory.id;
    }
  }, [rootCategory]);

  if (!rootCategoryId || (!loadingRootCategory && !rootCategory)) {
    return <p>Not Found</p>;
  }

  return (
    <HelmetProvider>
      <Helmet>
        <html lang={i18n.language} />
        <title>{`${t('general.help_center')}`}</title>
      </Helmet>
      <BrowserRouter basename={`/help-center/${rootCategoryId}`}>
        <Suspense fallback={<Loading />}>
          <div className="flex flex-col flex-1">
            <Header />
            <AppRoutes />
          </div>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  );
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/topic/:topicId" element={<Topic />} />
      <Route path="/topic/:topicId/article/:articleId" element={<Article />} />
      <Route path="/article/:articleId" element={<Article />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/categories/:id" element={<Categories />} />
      <Route path="/tickets/*" element={<Tickets />} />
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
          credential: StringParam,
          'associate-anonymous-id': StringParam,
          from: StringParam,
        },
        parse(window.location.hash)
      ),
    []
  );
}
