import { PropsWithChildren } from 'react';
import { ErrorBoundary } from '@sentry/react';

import { ExceptionPage } from '@/components/ErrorPage';

export default function ({ module, children }: PropsWithChildren<{ module: string }>) {
  return (
    <ErrorBoundary
      fallback={<ExceptionPage />}
      beforeCapture={(scope) => scope.setExtras({ module })}
    >
      {children}
    </ErrorBoundary>
  );
}
