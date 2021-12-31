import { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import { ControlButton } from 'components/ControlButton';
import { ErrorBoundary } from '../ErrorBoundary';
import styles from './index.module.css';

export function PageHeader(props: ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation();

  return (
    <>
      <div
        id="page-header"
        className={cx(
          styles.header,
          'flex-shrink-0 z-20 top-0 px-[10px] sm:px-[108px] pt-[52px] sm:pt-[10px]',
          props.className
        )}
      >
        <ControlButton className="absolute top-3 sm:top-[10px] left-[10px] sm:left-[22px]" />
      </div>
      <div className="z-10 overflow-hidden">
        <h1
          className={`bg-white rounded-t-lg py-2 px-4  mx-[10px] sm:mx-[108px] text-center font-bold border-b border-gray-100`}
        >
          {props.children ?? t('general.call_center')}
        </h1>
      </div>
    </>
  );
}

export function PageContent({ children, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={cx(
        'page flex flex-col flex-grow bg-white rounded-b-lg mx-[10px] sm:mx-[108px] mb-[10px]',
        styles.content,
        props.className
      )}
    >
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
