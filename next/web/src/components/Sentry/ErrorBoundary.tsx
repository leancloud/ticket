import React from 'react';
import * as Sentry from '@sentry/react';
import { Scope } from '@sentry/react';
import { ExceptionPage } from 'components/ErrorPage';

const ErrorBoundary: React.FunctionComponent<{ module: string }> = ({ module, children }) => {
  const beforeCapture = React.useCallback(
    (scope: Scope) => {
      scope.setExtras({
        module,
      });
    },
    [module]
  );
  return (
    <Sentry.ErrorBoundary fallback={()=><ExceptionPage />} beforeCapture={beforeCapture}>
      {children}
    </Sentry.ErrorBoundary>
  );
};

// type ComponentType = Parameters<typeof Sentry.withErrorBoundary>[0];
// const withErrorBoundary = (WrappedComponent: ComponentType, name: string) => {
//   return Sentry.withErrorBoundary(WrappedComponent, {
//     fallback: ExceptionPage,
//     beforeCapture: (scope) => {
//       scope.setExtras({
//         module: name,
//       });
//     },
//   });
// };


export default  ErrorBoundary
