import { PropsWithChildren, useCallback } from 'react';
import { ErrorBoundary, Scope } from '@sentry/react';

import { ExceptionPage } from '@/components/ErrorPage';

export default function ({ module, children }: PropsWithChildren<{ module: string }>) {
  const beforeCapture = useCallback(
    (scope: Scope) => {
      scope.setExtras({ module });
    },
    [module]
  );

  return (
    <ErrorBoundary fallback={<ExceptionPage />} beforeCapture={beforeCapture}>
      {children}
    </ErrorBoundary>
  );
}
