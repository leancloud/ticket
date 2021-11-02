import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { get } from 'lodash-es';

import { Form, Select } from '@/components/antd';
import { useCustomerServices } from '@/api/user';

const { Option } = Select;

export function AuthorId({ path }: { path: string }) {
  const { control, formState } = useFormContext();
  const errors = get(formState.errors, path);

  const { data: users } = useCustomerServices();
  const options = useMemo(() => {
    return [
      { label: '(当前用户)', value: '__currentUser' },
      { label: '(负责人)', value: '__assignee' },
      { label: '(客服)', value: '__customerService' },
      ...(users?.map((u) => ({ label: u.nickname, value: u.id })) ?? []),
    ];
  }, [users]);

  return (
    <>
      <Form.Item>
        <Controller
          control={control}
          name={`${path}.op`}
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
            <Select
              {...field}
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
