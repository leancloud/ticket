import { QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';
import { BrowserRouter, Redirect, RouteProps, Switch } from 'react-router-dom';

import { auth } from '@/leancloud';
import { queryClient } from '@/api/query-client';
import { SearchParamsProvicer } from '@/utils/useSearchParams';
import { SentryRoute } from '@/components/Sentry';
import Admin from './Admin';
import Login from './Login';

function AuthRoute(props: RouteProps) {
  if (!auth.currentUser) {
    return <Redirect to="/login" />;
  }
  return <SentryRoute {...props} />;
}

function Routes() {
  return (
    <Switch>
      <AuthRoute path="/admin">
        <Admin />
      </AuthRoute>
      <SentryRoute path="/login">
        <Login />
      </SentryRoute>
      <Redirect to="/admin" />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <BrowserRouter basename="/next">
          <SearchParamsProvicer>
            <Routes />
          </SearchParamsProvicer>
        </BrowserRouter>
      </RecoilRoot>
    </QueryClientProvider>
  );
}
