import { ReactNode, StrictMode, useRef } from 'react';
import { render } from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';
import { message } from 'antd';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import 'github-markdown-css/github-markdown-light.css';

import './index.css';
import '@/components/antd/index.less';
import './i18n';
import App from './App';

// if (import.meta.nv.VITE_SENTRY_WEB_DSN) {
//   Sentry.init({
//     dsn: import.meta.env.VITE_SENTRY_WEB_DSN,
//     integrations: [new Integrations.BrowserTracing()],
//     tracesSampleRate: 1.0,
//     ignoreErrors: [],
//     enabled: import.meta.env.PROD,
//     initialScope: {
//       tags: {
//         type: 'help-center',
//       },
//     },
//   });
// }

function MyQueryClientProvider({ children }: { children?: ReactNode }) {
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
            console.log(error);
            const content = error instanceof Error ? error.message : 'Something went wrong.';
            message.warning(content);
          },
        },
      },
    });
  }

  return <QueryClientProvider client={queryClient.current}>{children}</QueryClientProvider>;
}

render(
  <StrictMode>
    <MyQueryClientProvider>
      <RecoilRoot>
        <App />
      </RecoilRoot>
    </MyQueryClientProvider>
  </StrictMode>,
  document.getElementById('root')
);
