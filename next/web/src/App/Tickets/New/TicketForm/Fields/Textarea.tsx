import { memo } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { Form, Input } from '@/components/antd';

export interface TextareaProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
}

export const Textarea = memo(({ name, label, description, required }: TextareaProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({
    control,
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
      help={error?.message || description}
      validateStatus={error ? 'error' : undefined}
    >
      <Input.TextArea {...field} id={id} />
    </Form.Item>
  );
});
