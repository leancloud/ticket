import { forwardRef } from 'react';
import classNames from 'classnames';

type IntrinsicInputProps = JSX.IntrinsicElements['input'];

export interface InputProps extends IntrinsicInputProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return (
    <input
      {...props}
      ref={ref}
      className={classNames(
        props.className,
        'border rounded px-2 py-1 focus:border-tapBlue-600 focus:ring-tapBlue-600 focus:ring-1'
      )}
    />
  );
});
