import { ChangeEventHandler, useCallback } from 'react';
import { ErrorMessage } from '../ErrorMessage';

export interface TextareaProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  error?: string;
}

export function Textarea({
  value = '',
  onChange,
  placeholder,
  rows,
  maxLength,
  error,
}: TextareaProps) {
  const handleChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(
    (e) => {
      const value = e.target.value;
      if (maxLength !== undefined && value.length > maxLength) {
        onChange(value.slice(0, maxLength));
      } else {
        onChange(value);
      }
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
