import { ComponentPropsWithoutRef } from 'react';
import classNames from 'classnames';

export type ErrorMessageProps = ComponentPropsWithoutRef<'div'>;

export function ErrorMessage({ className, children, ...props }: ErrorMessageProps) {
  if (!children) {
    return null;
  }
  return (
    <div {...props} className={classNames(className, 'text-xs text-red')}>
      {children}
    </div>
  );
}
