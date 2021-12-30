import {
  ChangeEventHandler,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { ControlRef } from '..';
import { ErrorMessage } from '../ErrorMessage';
import { scrollIntoViewInNeeded } from '../utils';

export interface TextareaProps {
  onChange: (value?: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  error?: string;
}

export const Textarea = forwardRef<ControlRef, TextareaProps>(
  ({ onChange, placeholder, rows = 3, maxLength, error }, ref) => {
    const $textarea = useRef<HTMLTextAreaElement>(null!);
    const [value, setValue] = useState('');

    const handleChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(
      (e) => {
        let nextValue = e.target.value;
        if (maxLength !== undefined && nextValue.length > maxLength) {
          nextValue = nextValue.slice(0, maxLength);
        }
        onChange(nextValue || undefined);
        setValue(nextValue);
      },
      [onChange, maxLength]
    );

    useImperativeHandle(ref, () => ({
      focus: () => {
        $textarea.current.focus();
        setTimeout(() => scrollIntoViewInNeeded($textarea.current), 17);
      },
    }));

    return (
      <div>
        <textarea
          ref={$textarea}
          className={`w-full px-3 py-1.5 border rounded text-sm ${
            error
              ? 'border-red'
              : 'focus:border-tapBlue focus:ring-1 focus:ring-tapBlue border-[rgba(0,0,0,0.08)]'
          }`}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={(e) => scrollIntoViewInNeeded(e.target)}
        />

        <ErrorMessage className="float-left mt-0.5">{error}</ErrorMessage>

        {maxLength !== undefined && (
          <span className="float-right mt-0.5 text-xs text-[#BFBFBF]">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    );
  }
);
