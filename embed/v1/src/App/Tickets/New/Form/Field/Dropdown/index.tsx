import { ChevronDownIcon } from '@heroicons/react/solid';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';

import { ErrorMessage } from '../ErrorMessage';

export interface DropdownOption {
  title: string;
  value: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}

export function Dropdown({ options, value = '', onChange, error }: DropdownProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="relative flex items-center">
        <select
          className={classNames('w-full px-3 py-1.5 border rounded border-gray-300', {
            'text-gray-400': !value,
            'focus:border-tapBlue-600 focus:ring-1 focus:ring-tapBlue-600': !error,
            'border-red-500': error,
          })}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        >
          <option value="" hidden>
            {t('general.select_hint')}
          </option>
          {options.map(({ title, value }) => (
            <option key={value} value={value}>
              {title}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="w-4 h-4 absolute right-2 text-gray-300 pointer-events-none" />
      </div>
      <ErrorMessage className="mt-1">{error}</ErrorMessage>
    </div>
  );
}
