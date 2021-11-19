import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import cx from 'classnames';

import { CustomFieldProps } from '..';
import { ErrorMessage } from '../ErrorMessage';

export function Input({ id, required }: CustomFieldProps) {
  const { t } = useTranslation();
  const { register, formState } = useFormContext();
  const error = formState.errors[id];

  return (
    <div>
      <input
        {...register(id, {
          required: {
            value: required,
            message: t('validation.required'),
          },
        })}
        className={cx('w-full px-3 py-2 border rounded text-sm', {
          'focus:border-tapBlue focus:ring-1 focus:ring-tapBlue': !error,
          'border-[rgba(0,0,0,0.08)]': !error,
          'border-red-500': error,
        })}
        type="text"
      />
      {error && <ErrorMessage className="mt-1">{error.message}</ErrorMessage>}
    </div>
  );
}
