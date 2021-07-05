import { ChangeEvent, useMemo } from 'react';

export interface InputProps {
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
}

export function Input({ value, onChange, placeholder, error }: InputProps) {
  const handleChange = useMemo(() => {
    if (!onChange) {
      return undefined;
    }
    return (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
  }, [onChange]);

  return (
    <div>
      <input
        type="text"
        className={`w-full border rounded px-2 py-1 ${
          error ? 'border-red-500' : 'focus:border-tapBlue-600 focus:ring-1 focus:ring-tapBlue-600'
        }`}
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
      />
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}
