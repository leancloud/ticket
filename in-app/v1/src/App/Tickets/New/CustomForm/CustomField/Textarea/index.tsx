import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import cx from 'classnames';

import { CustomFieldProps } from '..';
import { Description } from '../Description';

const DEFAULT_ROWS = 3;

export function Textarea({ id, description, required, htmlId }: CustomFieldProps) {
  const { t } = useTranslation();
  const { register, formState } = useFormContext();
  const error = formState.errors[id];

  return (
    <>
      <textarea
        {...register(id, {
          required: {
            value: required,
            message: t('validation.required'),
          },
        })}
        id={htmlId}
        className={cx('w-full rounded h-[68px]')}
        rows={DEFAULT_ROWS}
      />
      <Description className="mt-[8px]" error={error}>
        {description}
      </Description>
    </>
  );
}
