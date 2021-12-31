import classNames from 'classnames';
import { forwardRef, useImperativeHandle, useRef } from 'react';

import { ControlRef } from '..';
import { ErrorMessage } from '../ErrorMessage';
import { scrollIntoViewInNeeded } from '../utils';

export interface InputProps {
  onChange: (value?: string) => void;
  placeholder?: string;
  error?: string;
}

export const Input = forwardRef<ControlRef, InputProps>(({ onChange, placeholder, error }, ref) => {
  const $input = useRef<HTMLInputElement>(null!);

  useImperativeHandle(ref, () => ({
    focus: () => {
      $input.current.focus();
      setTimeout(() => scrollIntoViewInNeeded($input.current), 17);
    },
  }));

  return (
    <div>
      <input
        ref={$input}
        type="text"
        className={classNames('w-full px-3 py-2 border rounded text-sm', {
          'focus:border-tapBlue focus:ring-1 focus:ring-tapBlue': !error,
          'border-[rgba(0,0,0,0.08)]': !error,
          'border-red': error,
        })}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value || undefined)}
        onBlur={(e) => scrollIntoViewInNeeded(e.target)}
      />

      <ErrorMessage className="mt-1">{error}</ErrorMessage>
    </div>
  );
});
