import { useTranslation } from 'react-i18next';
import { FormProvider, useForm } from 'react-hook-form';

import { CategoryFieldSchema } from '@/api/category';
import { Button } from '@/components/Button';
import { SpaceChinese } from '@/components/SpaceChinese';
import { CustomField } from './CustomField';

export interface CustomFormProps {
  fields: CategoryFieldSchema[];
  defaultValues?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  onSubmit: (data: Record<string, any>) => void;
  submitting?: boolean;
}

export function CustomForm({
  fields,
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
      <form className="px-5 sm:px-8 py-7" onSubmit={methods.handleSubmit(onSubmit)}>
        {fields.map((field) => (
          <CustomField key={field.id} {...field} />
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
