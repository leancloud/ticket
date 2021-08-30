import { ComponentPropsWithoutRef } from 'react';
import cx from 'classnames';

export interface InputProps extends ComponentPropsWithoutRef<'input'> {}

export function Input({ ...props }: InputProps) {
  return (
    <input
      {...props}
      className={cx(
        'outline-none px-3 py-1 border border-[#cfd7df] hover:border-[#465867] focus:border-primary rounded ring-primary focus:ring-1 transition-colors',
        props.className
      )}
    />
  );
}
