import { ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FormProvider, useForm } from 'react-hook-form';
import cx from 'classnames';

import { CategoryFieldSchema, FieldType } from '@/api/category';
import { Button } from '@/components/Button';
import { SpaceChinese } from '@/components/SpaceChinese';
import style from './index.module.css';
import { CustomField } from './CustomField';

const TOP_LABEL_TYPES: FieldType[] = ['multi-select', 'radios'];
const I18N_KEY_BY_ID: Record<string, string | undefined> = {
  title: 'general.title',
  description: 'general.description',
};

export interface GroupProps {
  title?: string;
  required?: boolean;
  children?: ReactNode;
  labelAtTop?: boolean;
}

export function Group({ title, required, children, labelAtTop }: GroupProps) {
  return (
    <div className="flex flex-col sm:flex-row mb-5 last:mb-0">
      <div className="flex-shrink-0 mb-2 sm:mb-0 sm:w-[60px] sm:mr-4">
        {title && (
          <label
            className={cx('relative break-words', {
              [style.required]: required,
              'sm:top-[7px]': !labelAtTop,
            })}
          >
            {title}
          </label>
        )}
      </div>
      <div className="flex-grow">{children}</div>
    </div>
  );
}

export interface CustomFormProps {
  fields: CategoryFieldSchema[];
  onSubmit: (data: Record<string, any>) => void;
  submitting?: boolean;
}

export function CustomForm({ fields, onSubmit, submitting }: CustomFormProps) {
  const { t } = useTranslation();
  const methods = useForm();

  const getFieldTitle = useCallback(
    ({ id, title }: CategoryFieldSchema) => {
      const key = I18N_KEY_BY_ID[id];
      return key ? t(key) : title;
    },
    [t]
  );

  return (
    <FormProvider {...methods}>
      <form className="px-5 sm:px-10 py-7" onSubmit={methods.handleSubmit(onSubmit)}>
        {fields.map((field) => (
          <Group
            key={field.id}
            title={getFieldTitle(field)}
            required={field.required}
            labelAtTop={TOP_LABEL_TYPES.includes(field.type)}
          >
            <CustomField {...field} />
          </Group>
        ))}

        <Button
          className="sm:ml-20 w-full sm:max-w-max sm:px-11"
          type="submit"
          disabled={submitting}
        >
          <SpaceChinese>{t('general.commit')}</SpaceChinese>
        </Button>
      </form>
    </FormProvider>
  );
}
