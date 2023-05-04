import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import cx from 'classnames';

import { CustomFieldProps } from '..';
import { Description } from '../Description';

function safeCreateRegExp(pattern: string) {
  try {
    return new RegExp(pattern);
  } catch {} // ignore
}

export function Input({ id, description, required, htmlId, pattern }: CustomFieldProps) {
  const { t } = useTranslation();
  const { register, formState } = useFormContext();
  const error = formState.errors[id];

  const regexp = useMemo(() => {
    if (pattern) {
      return safeCreateRegExp(pattern);
    }
  }, [pattern]);

  return (
    <>
      <input
        {...register(id, {
          validate: (value) => {
            if (required && (!value || !value.trim())) {
              return t('validation.required') as string;
            }
            if (regexp && value && !regexp.test(value)) {
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
