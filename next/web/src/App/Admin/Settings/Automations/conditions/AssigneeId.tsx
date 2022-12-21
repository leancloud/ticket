import { useMemo } from 'react';
import { Controller } from 'react-hook-form';

import { useCustomerServices } from '@/api/user';
import { Form, NULL_STRING, Select } from '@/components/antd';

const { Option } = Select;

export function AssigneeId({ path }: { path: string }) {
  const { data: assignees } = useCustomerServices();
  const options = useMemo(() => {
    return [
      { label: '(未设置)', value: NULL_STRING },
      { label: '(创建者)', value: '__author' },
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
        rules={{
          validate: (value) => value !== undefined,
        }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item validateStatus={error ? 'error' : undefined}>
            <Select
              {...field}
              showSearch
              options={options}
              placeholder="请选择"
              value={field.value === null ? NULL_STRING : field.value}
              onChange={(value) => field.onChange(value === NULL_STRING ? null : value)}
              optionFilterProp="label"
              style={{ width: 200 }}
            />
          </Form.Item>
        )}
      />
    </>
  );
}
