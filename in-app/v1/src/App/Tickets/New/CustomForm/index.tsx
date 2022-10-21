import { useTranslation } from 'react-i18next';
import { FormProvider, useForm } from 'react-hook-form';

import { Button } from '@/components/Button';
import { SpaceChinese } from '@/components/SpaceChinese';
import { CustomField, CustomFieldConfig } from './CustomField';
import { FormNote, FormNoteProps } from './FormNote';

export type { CustomFieldConfig } from './CustomField';

export type CustomFormItem =
  | {
      type: 'field';
      data: CustomFieldConfig;
    }
  | {
      type: 'note';
      data: FormNoteProps & { id: string };
    };

export interface CustomFormProps {
  items: CustomFormItem[];
  defaultValues?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  onSubmit: (data: Record<string, any>) => void;
  submitting?: boolean;
}

export function CustomForm({
  items,
  defaultValues,
  onChange,
  onSubmit,
  submitting,
}: CustomFormProps) {
  const { t } = useTranslation();
  const methods = useForm({ defaultValues });

  if (onChange) {
    methods.watch(onChange);
  }

  return (
    <FormProvider {...methods}>
      <form className="px-4 sm:px-8 py-7" onSubmit={methods.handleSubmit(onSubmit)}>
        {items.map(({ type, data }) => {
          switch (type) {
            case 'field':
              return <CustomField key={data.id} {...data} />;
            case 'note':
              return <FormNote key={data.id} {...data} />;
          }
        })}

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
