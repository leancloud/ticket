import { Controller } from 'react-hook-form';

import { Form } from '@/components/antd';
import { CategorySelect } from '@/components/common';

export function UpdateCategoryId({ path }: { path: string }) {
  return (
    <Controller
      name={`${path}.value`}
      rules={{ required: true }}
      render={({ field, fieldState: { error } }) => (
        <Form.Item validateStatus={error ? 'error' : undefined}>
          <CategorySelect {...field} style={{ width: 260 }} />
        </Form.Item>
      )}
    />
  );
}
