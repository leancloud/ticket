import { ReactNode, StrictMode, useRef } from 'react';
import { render } from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import 'github-markdown-css/github-markdown-light.css';

import './index.css';
import './i18n';
import { AlertProvider, useAlert } from './components/Alert';
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

function MyQueryClientProvider({ children }: { children?: ReactNode }) {
  const alert = useAlert();

  const queryClient = useRef<QueryClient>();
  if (!queryClient.current) {
    queryClient.current = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: false,
        },
        mutations: {
          onError: (error) => {
            const message = error instanceof Error ? error.message : 'Something went wrong.';
            alert({ title: 'Oops', content: message });
          },
        },
      },
    });
  }

  return <QueryClientProvider client={queryClient.current}>{children}</QueryClientProvider>;
}

render(
  <StrictMode>
    <AlertProvider>
      <MyQueryClientProvider>
        <RecoilRoot>
          <App />
        </RecoilRoot>
      </MyQueryClientProvider>
    </AlertProvider>
  </StrictMode>,
  document.getElementById('root')
);
