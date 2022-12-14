import { memo } from 'react';
import { useController } from 'react-hook-form';

import { Form, Input } from '@/components/antd';
import { Help } from './Help';

export interface NumberProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
}

export const Number = memo(({ name, label, description, required }: NumberProps) => {
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
      pattern: {
        value: /^\d*$/,
        message: '不能含有非数字字符',
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
      <Input {...field} id={id} inputMode="numeric" />
    </Form.Item>
  );
});
