import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

import Admin from './Admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function NotFound() {
  return <div>404</div>;
}

function Routes() {
  return (
    <Switch>
      <Route path="/a">
        <Admin />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/next">
        <Routes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
