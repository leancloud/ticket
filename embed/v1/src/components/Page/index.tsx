import { PropsWithChildren } from 'react';

import { ErrorBoundary } from '../ErrorBoundary';

export type PageProps = PropsWithChildren<{ title?: string }>;

export function Page({ title, children }: PageProps) {
  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow">
      <h1 className="py-3 text-center border-b border-gray-100 font-bold">{title || '客服中心'}</h1>
      <div className="flex-grow overflow-hidden">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
