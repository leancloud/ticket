import { QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';
import { BrowserRouter, Redirect, Route, RouteProps, Switch } from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';

import { auth } from 'leancloud';
import { queryClient } from 'api/query-client';
import Admin from './Admin';
import Login from './Login';

function AuthRoute(props: RouteProps) {
  if (!auth.currentUser) {
    return <Redirect to="/login" />;
  }
  return <Route {...props} />;
}

function Routes() {
  return (
    <Switch>
      <AuthRoute path="/admin">
        <Admin />
      </AuthRoute>
      <Route path="/login">
        <Login />
      </Route>
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
