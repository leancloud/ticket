import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import cx from 'classnames';
import { formatISO } from 'date-fns';

import { CustomFieldProps } from '..';
import { Description } from '../Description';

export function DateInput({ id, description, required, htmlId }: CustomFieldProps) {
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
          setValueAs: (v) => v && formatISO(new Date()),
        })}
        id={htmlId}
        className={cx('w-full rounded leading-[22px]')}
        type="date"
      />
      <Description error={error}>{description}</Description>
    </>
  );
}
