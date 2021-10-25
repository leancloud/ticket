import { StrictMode } from 'react';
import { render } from 'react-dom';

import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

import 'components/antd/index.less';
import './index.css';
import App from './App';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DNS,
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
  ignoreErrors: [],
  // release: `` ,
  // environment: '', // 环境指代 发布的应用
  enabled: !import.meta.env.DEV,
  initialScope: {
    tags: {
      type: 'frontend',
    },
  },
});

render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById('app')
);
