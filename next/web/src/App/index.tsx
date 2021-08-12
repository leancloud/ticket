import { QueryClient, QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';
import { BrowserRouter, Redirect, Route, RouteProps, Switch } from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';

import { auth } from '../leancloud';
import Admin from './Admin';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function AuthRoute(props: RouteProps) {
  useEffect(() => {
    if (!auth.currentUser) {
      location.href = '/login';
    }
  });

  return auth.currentUser ? <Route {...props} /> : null;
}

function Routes() {
  return (
    <Switch>
      <AuthRoute path="/admin">
        <Admin />
      </AuthRoute>
      <Redirect to="/admin" />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <BrowserRouter basename="/next">
          <QueryParamProvider ReactRouterRoute={Route}>
            <Routes />
          </QueryParamProvider>
        </BrowserRouter>
      </RecoilRoot>
    </QueryClientProvider>
  );
}
