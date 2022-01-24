import { PropsWithChildren, useCallback, useRef } from 'react';
import cx from 'classnames';

import styles from './index.module.css';

export interface RadioProps {
  checked?: boolean;
  onChange?: () => void;
  fluid?: boolean;
}

export function Radio({ checked, onChange, fluid, children }: PropsWithChildren<RadioProps>) {
  const $input = useRef<HTMLInputElement>(null!);
  const handleClick = useCallback(() => $input.current.click(), []);

  return (
    <span className={cx('inline-flex items-center', { 'w-full': fluid })}>
      <input
        ref={$input}
        type="radio"
        className={cx(
          styles.radio,
          'shrink-0 w-[14px] h-[14px] rounded-full border-2 border-[#D9D9D9]',
          {
            'border-tapBlue': checked,
          }
        )}
        checked={checked}
        onChange={onChange}
      />
      <label className="inline-flex grow items-center ml-2 text-[#666]" onClick={handleClick}>
        {children}
      </label>
    </span>
  );
}
