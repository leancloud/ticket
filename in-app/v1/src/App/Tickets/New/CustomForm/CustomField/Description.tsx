import { ComponentPropsWithoutRef } from 'react';
import classNames from 'classnames';

export interface DescriptionProps extends ComponentPropsWithoutRef<'div'> {
  error?: {
    message?: string;
  };
}

export function Description({ children, className, error, ...props }: DescriptionProps) {
  if (!children && !error) {
    return null;
  }
  return (
    <div
      {...props}
      className={classNames('mt-[10px] text-xs leading-[14px]', className, {
        'text-[#D2D7D9]': !error,
        'text-red': error,
      })}
    >
      {error?.message ?? children}
    </div>
  );
}
