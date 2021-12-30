import {
  ChangeEventHandler,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ChevronDownIcon } from '@heroicons/react/solid';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';

import { ErrorMessage } from '../ErrorMessage';
import { ControlRef } from '..';

export interface DropdownOption {
  title: string;
  value: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  onChange: (value: string) => void;
  error?: string;
}

export const Dropdown = forwardRef<ControlRef, DropdownProps>(
  ({ options, onChange, error }, ref) => {
    const { t } = useTranslation();
    const $select = useRef<HTMLSelectElement>(null!);
    const [value, setValue] = useState('');

    const handleChange = useCallback<ChangeEventHandler<HTMLSelectElement>>(
      (e) => {
        const value = e.target.value;
        setValue(value);
        onChange(value);
      },
      [onChange]
    );

    useImperativeHandle(ref, () => ({
      focus: () => $select.current.focus(),
    }));

    return (
      <div>
        <div className="relative flex items-center">
          <select
            className={classNames('w-full px-3 py-2 border rounded text-sm', {
              'text-[#BFBFBF]': !value,
              'focus:border-tapBlue focus:ring-1 focus:ring-tapBlue': !error,
              'border-[rgba(0,0,0,0.08)]': !error,
              'border-red': error,
            })}
            value={value}
            onChange={handleChange}
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

          <ChevronDownIcon className="w-4 h-4 absolute right-2 text-[#BFBFBF] pointer-events-none" />
        </div>

        <ErrorMessage className="mt-1">{error}</ErrorMessage>
      </div>
    );
  }
);
