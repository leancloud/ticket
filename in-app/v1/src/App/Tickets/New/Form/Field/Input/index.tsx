import classNames from 'classnames';

import { ErrorMessage } from '../ErrorMessage';

export interface InputProps {
  onChange: (value?: string) => void;
  placeholder?: string;
  error?: string;
}

export function Input({ onChange, placeholder, error }: InputProps) {
  return (
    <div>
      <input
        type="text"
        className={classNames('w-full px-3 py-1.5 border rounded border-gray-300', {
          'focus:border-tapBlue focus:ring-1 focus:ring-tapBlue': !error,
          'border-red-500': error,
        })}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={placeholder}
      />
      <ErrorMessage className="mt-1">{error}</ErrorMessage>
    </div>
  );
}
