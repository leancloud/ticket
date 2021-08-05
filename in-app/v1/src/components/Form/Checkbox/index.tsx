import { PropsWithChildren, useCallback, useRef } from 'react';
import { CheckIcon } from '@heroicons/react/solid';
import cx from 'classnames';

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  fluid?: boolean;
}

export function Checkbox({ checked, onChange, fluid, children }: PropsWithChildren<CheckboxProps>) {
  const $input = useRef<HTMLInputElement>(null!);
  const handleClick = useCallback(() => $input.current.click(), []);

  return (
    <span className={cx('inline-flex items-center', { 'w-full': fluid })}>
      <span className={`flex-shrink-0 inline-flex justify-center items-center w-4 h-4 relative`}>
        <input
          ref={$input}
          type="checkbox"
          className={cx('w-full h-full rounded-sm box-border border-2 border-[#D9D9D9]', {
            'bg-tapBlue border-tapBlue': checked,
          })}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        {checked && <CheckIcon className="absolute w-4 h-4 text-white pointer-events-none" />}
      </span>
      <label className="flex-grow ml-2 text-[#666]" onClick={handleClick}>
        {children}
      </label>
    </span>
  );
}
