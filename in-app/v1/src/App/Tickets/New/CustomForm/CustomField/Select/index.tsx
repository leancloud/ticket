import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import cx from 'classnames';

import { CustomFieldProps } from '..';
import { Description } from '../Description';

export function Select({ id, description, options, required, htmlId }: CustomFieldProps) {
  const { t } = useTranslation();
  const { register, formState, control } = useFormContext();
  const value = useWatch({ control, name: id });
  const error = formState.errors[id];

  return (
    <>
      <div className="relative flex items-center">
        <select
          {...register(id, {
            required: {
              value: required,
              message: t('validation.required'),
            },
          })}
          id={htmlId}
          className={cx('w-full py-2 rounded bg-white', {
            'text-[#BFBFBF]': !value,
          })}
        >
          {options?.map(({ title, value }, index) => (
            <option key={index} value={value}>
              {title}
            </option>
          ))}
        </select>
      </div>

      <Description error={error}>{description}</Description>
    </>
  );
}
