import { Controller, useFormContext } from 'react-hook-form';
import { get } from 'lodash-es';

import { Form, InputNumber, Select } from '@/components/antd';

const OPS = [
  { label: '是', value: 'is' },
  { label: '大于', value: 'gt' },
  { label: '大于或等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于或等于', value: 'lte' },
];

export function NumberValue({ path }: { path: string }) {
  const { control, formState, setValue } = useFormContext();
  const errors = get(formState.errors, path);

  return (
    <>
      <Controller
        control={control}
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

      <Form.Item validateStatus={errors?.value ? 'error' : undefined}>
        <Controller
          control={control}
          name={`${path}.value`}
          rules={{ required: true }}
          render={({ field }) => <InputNumber {...field} style={{ width: 200 }} />}
        />
      </Form.Item>
    </>
  );
}
