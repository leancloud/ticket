import classNames from 'classnames';

import { ErrorMessage } from '../ErrorMessage';

export interface InputProps {
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
}

export function Input({ value, onChange, placeholder, error }: InputProps) {
  return (
    <div>
      <input
        type="text"
        className={classNames('w-full px-3 py-1.5 border rounded border-gray-300', {
          'focus:border-tapBlue-600 focus:ring-1 focus:ring-tapBlue-600': !error,
          'border-red-500': error,
        })}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <ErrorMessage className="mt-1">{error}</ErrorMessage>
    </div>
  );
}
