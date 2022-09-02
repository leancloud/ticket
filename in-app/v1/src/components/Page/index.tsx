import { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import { ControlButton } from '@/components/ControlButton';
import { ErrorBoundary } from '../ErrorBoundary';
import styles from './index.module.css';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { useSDKInfo } from '@/App/SDKContext';

const NotchGap = () => {
  const [{ ORIENTATION, NOTCH }] = useSDKInfo();
  const isShow = NOTCH && ORIENTATION === 2;
  if (!isShow) {
    return null;
  }
  return <div className="pt-[40px]" />;
};

export function PageHeader(props: ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation();
  const [search] = useSearchParams();
  const showNav = search.get('nav') !== '0';

  return (
    <>
      <NotchGap />
      {showNav && (
        <div
          id="page-header"
          className={cx(
            styles.header,
            'shrink-0 z-20 top-0 px-[10px] sm:px-[108px] pt-[52px] sm:pt-[10px]',
            props.className
          )}
        >
          <ControlButton className="absolute top-3 sm:top-[10px] left-[10px] sm:left-[22px]" />
        </div>
      )}
      <div className={classNames('z-10 overflow-hidden', { ['pt-[10px]']: !showNav })}>
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
        'page flex flex-col grow overflow-hidden bg-white rounded-b-lg mx-[10px] sm:mx-[108px] mb-[10px]',
        styles.content,
        props.className
      )}
    >
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
