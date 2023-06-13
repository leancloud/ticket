import { useTranslation } from 'react-i18next';
import { FormProvider, useForm } from 'react-hook-form';
import { PageContent } from '@/components/Page';
import { Button } from '@/components/Button';
import { SpaceChinese } from '@/components/SpaceChinese';
import { CustomField, CustomFieldConfig, FieldType } from './CustomField';
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
import classNames from 'classnames';

export interface CustomFormProps {
  items: CustomFormItem[];
  defaultValues?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  onSubmit: (data: Record<string, any>) => void;
  submitting?: boolean;
}

const LABEL_FIELD: FieldType[] = ['text', 'multi-line', 'dropdown'];

export function CustomForm({
  items,
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
        {items.map(({ type, data }) => {
          return (
            <PageContent
              className="mb-3 last:mb-0"
              key={data.id}
              as={type === 'field' && LABEL_FIELD.includes(data.type) ? 'label' : undefined}
            >
              {type === 'field' && <CustomField key={data.id} {...data} />}
              {type === 'note' && <FormNote key={data.id} {...data} />}
            </PageContent>
          );
        })}

        <PageContent padding={false} className="!bg-transparent mt-4">
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
