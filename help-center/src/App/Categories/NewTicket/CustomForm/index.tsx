import { useTranslation } from 'react-i18next';
import { FormProvider, useForm } from 'react-hook-form';
import { SpaceChinese } from '@/components/SpaceChinese';
import { Form, Button } from '@/components/antd';
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

export interface CustomFormProps {
  items: CustomFormItem[];
  defaultValues?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  onSubmit: (data: Record<string, any>) => void;
  submitting?: boolean;
  formId?: string;
}

export function CustomForm({ items, defaultValues, onSubmit, formId }: CustomFormProps) {
  const { t } = useTranslation();
  const methods = useForm({ defaultValues });

  return (
    <FormProvider {...methods}>
      <Form id={formId} layout="vertical" onSubmitCapture={methods.handleSubmit(onSubmit)}>
        {items.map(({ type, data }) => {
          return (
            <div className="mb-3 last:mb-0" key={data.id}>
              {type === 'field' && <CustomField key={data.id} {...data} />}
              {type === 'note' && <FormNote key={data.id} {...data} />}
            </div>
          );
        })}
      </Form>
    </FormProvider>
  );
}
