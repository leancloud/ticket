import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import cx from 'classnames';

import { CustomFieldProps } from '..';
import { Description } from '../Description';

export function Input({ id, description, required, htmlId, regex }: CustomFieldProps) {
  const { t } = useTranslation();
  const { register, formState } = useFormContext();
  const error = formState.errors[id];

  const compiledRe = useMemo(() => {
    if (regex) {
      return new RegExp(regex);
    }
  }, [regex]);

  return (
    <>
      <input
        {...register(id, {
          required: {
            value: required,
            message: t('validation.required'),
          },
          validate: (value) => {
            if (compiledRe && !compiledRe.test(value)) {
              return t('validation.invalid') as string;
            }
            return true;
          },
        })}
        id={htmlId}
        className={cx('w-full rounded leading-[22px]')}
        type="text"
      />
      <Description error={error}>{description}</Description>
    </>
  );
}
