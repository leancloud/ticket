import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import { ControlButton } from '@/components/ControlButton';
import { ErrorBoundary } from '../ErrorBoundary';
import styles from './index.module.css';
import { useSearchParams } from 'react-router-dom';

export function PageHeader(props: ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation();
  const [search] = useSearchParams();
  const showNav = search.get('nav') !== '0';

  return (
    <>
      {showNav && (
        <div
          id="page-header"
          className={cx(
            styles.header,
            'shrink-0 z-20 top-0 px-[10px] sm:px-[119px] ',
            props.className
          )}
        >
          <ControlButton className="absolute top-3 sm:top-[10px] left-[10px] sm:left-[22px]" />
        </div>
      )}
      <div className={cx('z-10 overflow-hidden')}>
        <h1
          className={`py-4 text-[16px] leading-[1.5] mx-[10px] sm:mx-[119px] text-center font-bold`}
        >
          {props.children ?? t('general.call_center')}
        </h1>
      </div>
    </>
  );
}

export function PageContent({
  children,
  className,
  shadow,
  title,
  ...props
}: ComponentPropsWithoutRef<'div'> & { title?: ReactNode; shadow?: boolean }) {
  return (
    <div
      {...props}
      className={cx(
        'page flex flex-col shrink-0  overflow-hidden bg-white rounded-lg mx-[10px] sm:mx-[119px] last:mb-4 px-4 py-3',
        shadow && styles.contentShadow,
        className
      )}
    >
      <ErrorBoundary>
        {title && <h2 className={'font-bold'}>{title}</h2>}
        {children}
      </ErrorBoundary>
    </div>
  );
}
