import { Controller, useFormContext } from 'react-hook-form';
import { Form, Select } from 'antd';
import { get } from 'lodash-es';

import { CategorySelect } from '../../components/CategorySelect';

const { Option } = Select;

export function CategoryId({ path }: { path: string }) {
  const { control, formState } = useFormContext();
  const errors = get(formState.errors, path);

  return (
    <>
      <Form.Item>
        <Controller
          control={control}
          name={`${path}.op`}
          rules={{ required: true }}
          defaultValue="is"
          render={({ field }) => (
            <Select {...field} style={{ width: 160 }}>
              <Option value="is">是</Option>
              <Option value="isNot">不是</Option>
            </Select>
          )}
        />
      </Form.Item>
      <Form.Item validateStatus={errors?.value ? 'error' : undefined}>
        <Controller
          control={control}
          name={`${path}.value`}
          rules={{ required: true }}
          render={({ field }) => (
            <CategorySelect {...field} initValue={field.value} onChange={field.onChange} />
          )}
        />
      </Form.Item>
    </>
  );
}
