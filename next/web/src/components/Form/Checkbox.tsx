import { ComponentPropsWithoutRef, useEffect, useRef } from 'react';
import cx from 'classnames';

export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  indeterminate?: boolean;
}

export function Checkbox({ indeterminate, ...props }: CheckboxProps) {
  const $input = useRef<HTMLInputElement>(null!);

  useEffect(() => {
    $input.current.indeterminate = !!indeterminate;
  }, [indeterminate]);

  return (
    <input
      {...props}
      ref={$input}
      className={cx(
        'form-checkbox w-[14px] h-[14px] border-[#cfd7df] rounded-sm text-primary',
        props.className
      )}
      type="checkbox"
    />
  );
}
