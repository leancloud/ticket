import { memo } from 'react';
import { useController } from 'react-hook-form';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { CustomFieldProps } from './';
import { DatePicker, Form } from '@/components/antd';
import { Help } from './Help';

export interface DateProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
}

export const Date = memo(({ id, title, description, required }: CustomFieldProps) => {
  const [t] = useTranslation();
  const {
    field,
    fieldState: { error },
  } = useController({
    name: id,
    rules: {
      required: {
        value: !!required,
        message: t('ticket.fill', { value: title }),
      },
    },
  });

  return (
    <Form.Item
      label={title}
      htmlFor={id}
      required={required}
      help={error?.message || <Help content={description} />}
      validateStatus={error ? 'error' : undefined}
    >
      <DatePicker
        {...{
          ...field,
          value: field.value && moment(field.value),
          onChange: (date) => {
            field.onChange(date && date.format('YYYY-MM-DD'));
          },
        }}
        id={id}
      />
    </Form.Item>
  );
});
