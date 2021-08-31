import cx from 'classnames';

import { ComponentPropsWithoutRef } from 'react';

export type RadioProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'>;

export function Radio(props: RadioProps) {
  return (
    <input
      {...props}
      className={cx('form-radio w-[14px] h-[14px] border-[#cfd7df] text-primary', props.className)}
      type="radio"
    />
  );
}
