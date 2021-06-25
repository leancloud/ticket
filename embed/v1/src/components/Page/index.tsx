import classNames from 'classnames';

import { ErrorBoundary } from '../ErrorBoundary';

type DivProps = JSX.IntrinsicElements['div'];

interface PageProps extends DivProps {
  title?: string;
}

export function Page({ title, children, ...props }: PageProps) {
  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow overflow-hidden">
      <h1 className="py-3 text-center border-b border-gray-100 font-bold">{title || '客服中心'}</h1>
      <div {...props} className={classNames(props.className, 'flex-grow overflow-auto')}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
