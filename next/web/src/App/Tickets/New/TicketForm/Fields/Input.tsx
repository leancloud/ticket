import { memo } from 'react';
import { useController } from 'react-hook-form';

import { Form, Input as AntInput } from '@/components/antd';
import { Help } from './Help';

export interface InputProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
}

export const Input = memo(({ name, label, description, required }: InputProps) => {
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
      <AntInput {...field} id={id} />
    </Form.Item>
  );
});
