import { StrictMode } from 'react';
import { render } from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import 'github-markdown-css/github-markdown-light.css';
import './index.css';
import './i18n';
import App from './App';

if (import.meta.env.VITE_SENTRY_WEB_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_WEB_DSN,
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
    ignoreErrors: [],
    enabled: import.meta.env.PROD,
    initialScope: {
      tags: {
        type: 'in-app',
      },
    },
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <App />
      </RecoilRoot>
    </QueryClientProvider>
  </StrictMode>,
  document.getElementById('root')
);
