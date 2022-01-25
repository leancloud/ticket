import { memo } from 'react';
import { useController } from 'react-hook-form';

import { Form, Input } from '@/components/antd';
import { Help } from './Help';

export interface TextareaProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
}

export const Textarea = memo(({ name, label, description, required }: TextareaProps) => {
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
      <Input.TextArea {...field} id={id} />
    </Form.Item>
  );
});
