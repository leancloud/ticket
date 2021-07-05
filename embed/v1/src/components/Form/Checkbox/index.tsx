import { ChangeEvent, PropsWithChildren, useMemo, useRef } from 'react';
import { CheckIcon } from '@heroicons/react/solid';

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function Checkbox({ checked, onChange, children }: PropsWithChildren<CheckboxProps>) {
  const $input = useRef<HTMLInputElement>(null!);
  const $handleClick = useRef(() => $input.current.click());

  const handleChange = useMemo(() => {
    if (!onChange) {
      return undefined;
    }
    return (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked);
  }, [onChange]);

  return (
    <span className="inline-flex items-center w-full">
      <span className={`flex-shrink-0 inline-flex justify-center items-center w-4 h-4 relative`}>
        <input
          ref={$input}
          type="checkbox"
          className={`w-full h-full rounded-sm box-border border-2 ${
            checked ? 'bg-tapBlue-600 border-tapBlue-600' : 'border-gray-300'
          }`}
          checked={checked}
          onChange={handleChange}
        />
        {checked && <CheckIcon className="absolute w-4 h-4 text-white pointer-events-none" />}
      </span>
      <label className="flex-grow ml-4 text-gray-500" onClick={$handleClick.current}>
        {children}
      </label>
    </span>
  );
}
