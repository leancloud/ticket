import classNames from 'classnames';
import { PropsWithChildren, useCallback, useRef } from 'react';

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
    <span className={classNames('inline-flex items-center', { 'w-full': fluid })}>
      <input
        ref={$input}
        type="radio"
        className={classNames(
          styles.radio,
          'flex-shrink-0 w-4 h-4 rounded-full border-2 border-gray-300',
          {
            'border-tapBlue-600': checked,
          }
        )}
        checked={checked}
        onChange={onChange}
      />
      <label className="flex-grow ml-2 text-gray-500" onClick={handleClick}>
        {children}
      </label>
    </span>
  );
}
