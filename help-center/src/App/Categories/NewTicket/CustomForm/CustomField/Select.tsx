import { useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Form, Select as AntSelect } from '@/components/antd';
import { Help } from './Help';
import { CustomFieldProps } from './';

const fieldNames = {
  label: 'title',
  key: 'value',
};

export function Select({ id, title, description, options, required }: CustomFieldProps) {
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
      required={required}
      htmlFor={id}
      help={error?.message || <Help content={description} />}
      validateStatus={error ? 'error' : undefined}
    >
      <AntSelect
        {...field}
        id={id}
        placeholder={t('general.select_hint')}
        fieldNames={fieldNames}
        options={options as any}
      />
    </Form.Item>
  );
}
