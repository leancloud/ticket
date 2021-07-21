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
        className={`w-full px-3 py-1.5 border rounded border-gray-300 ${
          error ? 'border-red-500' : 'focus:border-tapBlue-600 focus:ring-1 focus:ring-tapBlue-600'
        }`}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
      />
      <ErrorMessage className="float-left">{error}</ErrorMessage>
      {maxLength !== undefined && (
        <span className="float-right text-xs text-gray-400">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
