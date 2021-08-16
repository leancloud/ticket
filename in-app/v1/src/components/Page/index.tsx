import { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import { ControlButton } from 'components/ControlButton';
import { ErrorBoundary } from '../ErrorBoundary';
import styles from './index.module.css';

function PageContainer({ children, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div {...props} className={cx('min-h-screen flex flex-col', props.className)}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}

export function PageHeader(props: ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation();

  return (
    <div
      className={cx(
        'flex-shrink-0 sticky top-0 z-[1] bg-[#E5E5E5] pt-[max(48px,env(safe-area-inset-top))] sm:pt-[max(10px,env(safe-area-inset-top))] mx-[-5px] px-[5px]',
        props.className
      )}
    >
      <ControlButton className="absolute top-[10px] sm:left-[-74px]" />
      <div className="overflow-hidden px-[5px] mx-[-5px] pt-[3px] mt[-3px]">
        <h1
          className={cx(
            'bg-white rounded-t-lg h-[38px] leading-[38px] text-center font-semibold border-b border-gray-100',
            styles.header
          )}
        >
          {props.children ?? t('general.call_center')}
        </h1>
      </div>
    </div>
  );
}

export function PageContent({ children, className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className="flex flex-col flex-grow overflow-hidden bg-[#E5E5E5] px-[5px] mx-[-5px]">
      <div {...props} className={cx('flex flex-grow flex-col bg-white', styles.content, className)}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}

export interface PageFooterProps extends ComponentPropsWithoutRef<'div'> {
  containerProps?: ComponentPropsWithoutRef<'div'>;
}

export function PageFooter({ className, containerProps, ...props }: PageFooterProps) {
  return (
    <div
      {...containerProps}
      className={cx(
        'flex-shrink-0 overflow-hidden bg-[#E5E5E5] px-[5px] mx-[-5px] pb-[max(10px,env(safe-area-inset-bottom))]',
        containerProps?.className
      )}
    >
      <div
        {...props}
        className={cx('bg-white rounded-b-lg min-h-[8px]', styles.footer, className)}
      />
    </div>
  );
}

export const Page = Object.assign(PageContainer, {
  Header: PageHeader,
  Content: PageContent,
  Footer: PageFooter,
});
