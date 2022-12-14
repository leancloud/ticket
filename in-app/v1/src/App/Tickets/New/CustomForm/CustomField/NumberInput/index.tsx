import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import cx from 'classnames';

import { CustomFieldProps } from '..';
import { Description } from '../Description';

export function NumberInput({ id, description, required, htmlId }: CustomFieldProps) {
  const { t } = useTranslation();
  const { register, formState } = useFormContext();
  const error = formState.errors[id];

  return (
    <>
      <input
        {...register(id, {
          required: {
            value: required,
            message: t('validation.required'),
          },
          pattern: {
            value: /^\d*$/,
            message: t('validation.number_required'),
          },
        })}
        id={htmlId}
        className={cx('w-full rounded leading-[22px]')}
        type="text"
        inputMode="numeric"
      />
      <Description error={error}>{description}</Description>
    </>
  );
}
