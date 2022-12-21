import { Controller, useWatch } from 'react-hook-form';

import { Form, Select } from '@/components/antd';
import { CategorySelect } from '@/components/common';

const { Option } = Select;

export function CategoryId({ path }: { path: string }) {
  const op = useWatch({ name: `${path}.op` });

  return (
    <>
      <Controller
        name={`${path}.op`}
        rules={{ required: true }}
        defaultValue="is"
        render={({ field }) => (
          <Form.Item>
            <Select {...field} style={{ width: 160 }}>
              <Option value="is">是</Option>
              <Option value="isNot">不是</Option>
              <Option value="isIncluded">归属于</Option>
            </Select>
          </Form.Item>
        )}
      />

      <Controller
        name={`${path}.value`}
        rules={{ required: true }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item validateStatus={error ? 'error' : undefined}>
            <CategorySelect
              {...field}
              changeOnSelect={op === 'isIncluded'}
              style={{ width: 260 }}
            />
          </Form.Item>
        )}
      />
    </>
  );
}
