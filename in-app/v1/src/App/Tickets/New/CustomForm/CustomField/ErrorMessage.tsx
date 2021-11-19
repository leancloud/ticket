import { ComponentPropsWithoutRef } from 'react';
import classNames from 'classnames';

export type ErrorMessageProps = ComponentPropsWithoutRef<'div'>;

export function ErrorMessage({ className, ...props }: ErrorMessageProps) {
  return <div {...props} className={classNames(className, 'text-xs text-red-500')} />;
}
