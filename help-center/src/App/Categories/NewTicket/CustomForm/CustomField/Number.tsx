import { memo } from 'react';
import { useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CustomFieldProps } from './';
import { Form, Input } from '@/components/antd';
import { Help } from './Help';

export interface NumberProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
}

export const Number = memo(({ id, title, description, required }: CustomFieldProps) => {
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
      pattern: {
        value: /^\d*$/,
        message: '不能含有非数字字符',
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
      <Input {...field} id={id} inputMode="numeric" />
    </Form.Item>
  );
});
