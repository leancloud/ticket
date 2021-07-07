import { ComponentPropsWithRef, forwardRef } from 'react';
import classNames from 'classnames';

export type InputProps = ComponentPropsWithRef<'input'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    {...props}
    ref={ref}
    type="text"
    className={classNames(
      className,
      'border rounded px-3 py-1 focus:border-tapBlue-600 focus:ring-1 focus:ring-tapBlue-600'
    )}
  />
));
