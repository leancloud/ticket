import { ChangeEventHandler, useCallback, useState } from 'react';

import { ErrorMessage } from '../ErrorMessage';

export interface TextareaProps {
  onChange: (value?: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  error?: string;
}

export function Textarea({ onChange, placeholder, rows = 3, maxLength, error }: TextareaProps) {
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

  return (
    <div>
      <textarea
        className={`w-full px-3 py-1.5 border rounded text-sm ${
          error
            ? 'border-red-500'
            : 'focus:border-tapBlue focus:ring-1 focus:ring-tapBlue border-[rgba(0,0,0,0.08)]'
        }`}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
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
