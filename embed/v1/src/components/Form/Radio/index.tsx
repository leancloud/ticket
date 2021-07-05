import { PropsWithChildren, useRef } from 'react';

import styles from './index.module.css';

export interface RadioProps {
  checked?: boolean;
  onChange?: () => void;
}

export function Radio({ checked, onChange, children }: PropsWithChildren<RadioProps>) {
  const $input = useRef<HTMLInputElement>(null!);
  const $handleClick = useRef(() => $input.current.click());

  return (
    <span className="inline-flex items-center w-full">
      <input
        ref={$input}
        type="radio"
        className={`${styles.radio} flex-shrink-0 w-4 h-4 rounded-full border-2 ${
          checked ? 'border-tapBlue-600' : 'border-gray-300'
        }`}
        checked={checked}
        onChange={onChange}
      />
      <label className="flex-grow ml-4 text-gray-500" onClick={$handleClick.current}>
        {children}
      </label>
    </span>
  );
}
