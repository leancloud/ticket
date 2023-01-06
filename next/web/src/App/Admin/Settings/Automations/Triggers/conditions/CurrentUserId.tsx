import { useMemo } from 'react';
import { Controller } from 'react-hook-form';

import { useCustomerServices } from '@/api/user';
import { Form, Select } from '@/components/antd';

const { Option } = Select;

export function CurrentUserId({ path }: { path: string }) {
  const { data: assignees } = useCustomerServices();
  const options = useMemo(() => {
    return [
      { label: '(客服)', value: '__customerService' },
      ...(assignees?.map((a) => ({ label: a.nickname, value: a.id })) ?? []),
    ];
  }, [assignees]);

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
            </Select>
          </Form.Item>
        )}
      />

      <Controller
        name={`${path}.value`}
        rules={{ validate: (value) => value !== undefined }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item validateStatus={error ? 'error' : undefined}>
            <Select
              {...field}
              showSearch
              options={options}
              placeholder="请选择"
              optionFilterProp="label"
              style={{ width: 200 }}
            />
          </Form.Item>
        )}
      />
    </>
  );
}
