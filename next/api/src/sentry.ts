import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

// Use one Sentry instance for v1 and v2 API
// Initialized in v1 (server.js)
export { Sentry, Tracing };
