import { memo } from 'react';
import { useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Form, Input } from '@/components/antd';
import { Help } from './Help';
import { CustomFieldProps } from './';

export const Textarea = memo(({ id, title, description, required }: CustomFieldProps) => {
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
      <Input.TextArea {...field} id={id} />
    </Form.Item>
  );
});
