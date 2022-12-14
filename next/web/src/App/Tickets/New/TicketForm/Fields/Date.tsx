import { memo } from 'react';
import { useController } from 'react-hook-form';
import moment from 'moment';

import { DatePicker, Form } from '@/components/antd';
import { Help } from './Help';

export interface DateProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
}

export const Date = memo(({ name, label, description, required }: DateProps) => {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    rules: {
      required: {
        value: !!required,
        message: `请填写${label}`,
      },
    },
  });

  const id = `ticket_${name}`;

  return (
    <Form.Item
      label={label}
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
