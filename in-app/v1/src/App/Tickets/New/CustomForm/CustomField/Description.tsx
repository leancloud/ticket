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
      className={classNames(className, 'text-xs', {
        'text-[rgba(0,0,0,0.45)]': !error,
        'text-red-500': error,
      })}
    >
      {error?.message ?? children}
    </div>
  );
}
