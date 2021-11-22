import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import { ChevronDownIcon } from '@heroicons/react/solid';
import cx from 'classnames';

import { CustomFieldProps } from '..';
import { ErrorMessage } from '../ErrorMessage';

export function Select({ id, required, options }: CustomFieldProps) {
  const { t } = useTranslation();
  const { register, formState, control } = useFormContext();
  const value = useWatch({ control, name: id });
  const error = formState.errors[id];

  return (
    <div>
      <div className="relative flex items-center">
        <select
          {...register(id, {
            required: {
              value: required,
              message: t('validation.required'),
            },
          })}
          className={cx('w-full px-3 py-2 border rounded text-sm', {
            'text-[#BFBFBF]': !value,
            'focus:border-tapBlue focus:ring-1 focus:ring-tapBlue': !error,
            'border-[rgba(0,0,0,0.08)]': !error,
            'border-red-500': error,
          })}
        >
          <option value="" hidden>
            {t('general.select_hint')}
          </option>
          {options?.map(({ title, value }, index) => (
            <option key={index} value={value}>
              {title}
            </option>
          ))}
        </select>

        <ChevronDownIcon className="w-4 h-4 absolute right-2 text-[#BFBFBF] pointer-events-none" />
      </div>

      {error && <ErrorMessage className="mt-1">{error.message}</ErrorMessage>}
    </div>
  );
}
