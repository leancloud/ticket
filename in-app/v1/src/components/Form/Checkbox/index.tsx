import { PropsWithChildren, useCallback, useRef } from 'react';
import { CheckIcon } from '@heroicons/react/solid';
import classNames from 'classnames';

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  fluid?: boolean;
}

export function Checkbox({ checked, onChange, fluid, children }: PropsWithChildren<CheckboxProps>) {
  const $input = useRef<HTMLInputElement>(null!);
  const handleClick = useCallback(() => $input.current.click(), []);

  return (
    <span className={classNames('inline-flex items-center', { 'w-full': fluid })}>
      <span className={`flex-shrink-0 inline-flex justify-center items-center w-4 h-4 relative`}>
        <input
          ref={$input}
          type="checkbox"
          className={classNames('w-full h-full rounded-sm box-border border-2 border-gray-300', {
            'bg-tapBlue-600 border-tapBlue-600': checked,
          })}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        {checked && <CheckIcon className="absolute w-4 h-4 text-white pointer-events-none" />}
      </span>
      <label className="flex-grow ml-2 text-gray-500" onClick={handleClick}>
        {children}
      </label>
    </span>
  );
}
