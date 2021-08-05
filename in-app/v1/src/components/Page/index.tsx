import { ComponentPropsWithoutRef } from 'react';
import cx from 'classnames';

import { ControlButton } from 'components/ControlButton';
import { ErrorBoundary } from '../ErrorBoundary';
import styles from './index.module.css';
import { useTranslation } from 'react-i18next';

export interface PageProps extends ComponentPropsWithoutRef<'div'> {
  title?: string;
}

export function Page({ className, children, title, ...props }: PageProps) {
  const { t } = useTranslation();

  return (
    <div
      {...props}
      className={cx(
        styles.page,
        'flex flex-col bg-white mx-[10px] sm:mx-28 mb-[10px] min-h-[calc(100%-10px)] rounded-b-lg',
        className
      )}
    >
      <div className="bg-[#E5E5E5] overflow-hidden sticky top-0 mx-[-10px] px-[10px] sm:-mx-28 sm:px-28 sm:pt-[10px] z-10">
        <div className="sm:absolute sm:left-0 h-12 sm:h-[38px] sm:w-28 flex items-center sm:justify-center">
          <ControlButton />
        </div>

        <h1
          className={cx(
            styles.title,
            'h-[38px] bg-white text-center leading-[38px] font-semibold rounded-t-lg border-b border-gray-100'
          )}
        >
          {title ?? t('general.call_center')}
        </h1>
      </div>

      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
