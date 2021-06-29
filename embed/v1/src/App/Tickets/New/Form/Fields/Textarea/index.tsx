import { ChangeEventHandler, useCallback } from 'react';

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
      if (maxLength !== undefined) {
        onChange(e.target.value.slice(0, maxLength));
      } else {
        onChange(e.target.value);
      }
    },
    [onChange, maxLength]
  );

  return (
    <div>
      <textarea
        className={`w-full px-2 py-1 rounded border ${
          error ? 'border-red-500' : 'focus:border-tapBlue-600 focus:ring-1 focus:ring-tapBlue-600'
        }`}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
      />
      <div>
        {error && <span className="float-left text-xs text-red-500">{error}</span>}
        {maxLength !== undefined && (
          <span className="float-right text-xs text-gray-400">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
