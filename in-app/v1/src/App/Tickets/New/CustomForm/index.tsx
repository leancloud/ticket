import { useTranslation } from 'react-i18next';
import { FormProvider, useForm } from 'react-hook-form';
import { PageContent } from '@/components/NewPage';
import { CategoryFieldSchema } from '@/api/category';
import { Button } from '@/components/Button';
import { SpaceChinese } from '@/components/SpaceChinese';
import { CustomField } from './CustomField';
import classNames from 'classnames';

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
  const methods = useForm({ defaultValues, mode: 'onTouched' });
  const {
    formState: { isValid },
  } = methods;

  if (onChange) {
    methods.watch(onChange);
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {fields.map((field) => (
          <PageContent className="mb-3 last:mb-0" key={field.id}>
            <CustomField key={field.id} {...field} />
          </PageContent>
        ))}
        <PageContent className="bg-transparent px-0">
          <Button
            className={classNames('w-full text-white', !isValid && 'opacity-50')}
            type="submit"
            disabled={submitting}
          >
            <SpaceChinese>{t('general.commit')}</SpaceChinese>
          </Button>
        </PageContent>
      </form>
    </FormProvider>
  );
}
