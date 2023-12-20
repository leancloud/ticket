import { memo } from 'react';
import { useController } from 'react-hook-form';
import { Form, Input as AntInput } from '@/components/antd';
import { useTranslation } from 'react-i18next';
import { CustomFieldProps } from '..';
import { Help } from '../Help';

export const Input = memo(({ title, id, description, required }: CustomFieldProps) => {
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
      <AntInput {...field} />
    </Form.Item>
  );
});
