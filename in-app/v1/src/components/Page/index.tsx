import { ComponentPropsWithoutRef, ReactNode, ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import { ControlButton } from '@/components/ControlButton';
import { ErrorBoundary } from '../ErrorBoundary';
import styles from './index.module.css';
import { useSearchParams } from 'react-router-dom';
import { useSDKInfo } from '@/components/SDK';

export function PageHeader(props: ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation();
  const [search] = useSearchParams();
  const [{ ORIENTATION, NOTCH }] = useSDKInfo();

  const withNotch = NOTCH && ORIENTATION === 1;
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
          <ControlButton
            className={cx(
              'absolute sm:top-[10px] left-[10px] sm:left-[22px]',
              withNotch ? 'top-[52px]' : 'top-[12px]'
            )}
          />
        </div>
      )}
      <div className={(cx('z-10 overflow-hidden'), withNotch ? 'mt-[40px]' : '')}>
        <h1
          className={`py-4 text-[16px] leading-[1.5] mx-[10px] sm:mx-[119px] text-center font-bold break-words`}
        >
          {props.children ?? t('general.call_center')}
        </h1>
      </div>
    </>
  );
}

interface PageContentProps<T extends ElementType> {
  title?: ReactNode;
  shadow?: boolean;
  padding?: boolean;
  as?: T;
  color?: number;
}

export function PageContent<T extends ElementType>({
  children,
  className,
  shadow,
  padding = true,
  title,
  as,
  color,
  ...props
}: PageContentProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof PageContentProps<T>>) {
  const Component = as || 'div';
  return (
    <Component
      {...props}
      className={cx(
        'page flex flex-col shrink-0  overflow-hidden bg-white rounded-lg mx-[10px] sm:mx-[119px] last:mb-4',
        padding && 'px-4 py-3',
        shadow && styles.contentShadow,
        className
      )}
    >
      <ErrorBoundary>
        {title && <h2 className={'font-bold'}>{title}</h2>}
        {children}
      </ErrorBoundary>
    </Component>
  );
}
