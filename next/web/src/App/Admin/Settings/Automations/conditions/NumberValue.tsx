import { Controller, useFormContext } from 'react-hook-form';

import { Form, InputNumber, Select } from '@/components/antd';

const OPS = [
  { label: '是', value: 'is' },
  { label: '大于', value: 'gt' },
  { label: '大于或等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于或等于', value: 'lte' },
];

export function NumberValue({ path }: { path: string }) {
  const { setValue } = useFormContext();

  return (
    <>
      <Controller
        name={`${path}.op`}
        defaultValue="is"
        render={({ field }) => (
          <Select
            {...field}
            onChange={(op) => {
              setValue(`${path}.op`, op);
              setValue(`${path}.value`, undefined);
            }}
            options={OPS}
            style={{ width: 160 }}
          />
        )}
      />

      <Controller
        name={`${path}.value`}
        rules={{ required: true }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item validateStatus={error ? 'error' : undefined}>
            <InputNumber {...field} style={{ width: 200 }} />
          </Form.Item>
        )}
      />
    </>
  );
}
