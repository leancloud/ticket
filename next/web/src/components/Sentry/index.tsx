import * as Sentry from '@sentry/react';
import { Severity } from '@sentry/react';
import ErrorBoundary from './ErrorBoundary';
const withProfiler = Sentry.withProfiler;

const captureException = (
  error: Error,
  options?: {
    tags?: {
      [key: string]: number | string;
    };
    user?: string;
    extras?: Record<string, string | number>;
  }
) => {
  if (options) {
    options.tags && Sentry.setTags(options.tags);
    options.user &&
      Sentry.setUser({
        username: options.user,
      });
    options.extras && Sentry.setExtras(options.extras);
  }
  Sentry.captureException(error);
};

const captureMessage = (msg: string, level = Severity.Info) => Sentry.captureMessage(msg, level);

export { captureException, withProfiler, captureMessage, Severity, ErrorBoundary };
