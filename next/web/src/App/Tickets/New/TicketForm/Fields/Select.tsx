import { useController } from 'react-hook-form';

import { Form, Select as AntSelect } from '@/components/antd';
import { Help } from './Help';

export interface Option {
  title: string;
  value: string;
}

export interface SelectProps {
  name: string;
  label: string;
  description?: string;
  options?: Option[];
  required?: boolean;
}

const fieldNames = {
  label: 'title',
  key: 'value',
};

export function Select({ name, label, description, options, required }: SelectProps) {
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
      required={required}
      htmlFor={id}
      help={error?.message || <Help content={description} />}
      validateStatus={error ? 'error' : undefined}
    >
      <AntSelect
        {...field}
        id={id}
        placeholder="请选择"
        fieldNames={fieldNames}
        options={options as any}
      />
    </Form.Item>
  );
}
