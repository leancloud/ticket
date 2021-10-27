import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Form, Select } from 'antd';
import { get } from 'lodash-es';

import { useCustomerServices } from '@/api/user';

const { Option } = Select;

export function CurrentUserId({ path }: { path: string }) {
  const { control, formState } = useFormContext();
  const errors = get(formState.errors, path);

  const { data: assignees } = useCustomerServices();
  const options = useMemo(() => {
    return [
      { label: '(客服)', value: '__customerService' },
      ...(assignees?.map((a) => ({ label: a.nickname, value: a.id })) ?? []),
    ];
  }, [assignees]);

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
          rules={{
            validate: (value) => value !== undefined,
          }}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value === null ? '' : field.value}
              onChange={(value) => field.onChange(value === '' ? null : value)}
              showSearch
              options={options}
              placeholder="请选择"
              optionFilterProp="label"
              style={{ width: 200 }}
            />
          )}
        />
      </Form.Item>
    </>
  );
}
