import { useMemo } from 'react';
import { Controller } from 'react-hook-form';

import { Form, NULL_STRING, Select } from '@/components/antd';
import { useCustomerServices } from '@/api/user';

export function UpdateAssigneeId({ path }: { path: string }) {
  const { data: assignees } = useCustomerServices();
  const options = useMemo(() => {
    return [
      { label: '(未设置)', value: NULL_STRING },
      { label: '(当前用户)', value: '__currentUser' },
      ...(assignees?.map((u) => ({ label: u.nickname, value: u.id })) ?? []),
    ];
  }, [assignees]);

  return (
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
            value={field.value === null ? NULL_STRING : field.value}
            onChange={(value) => field.onChange(value === NULL_STRING ? null : value)}
            optionFilterProp="label"
            style={{ width: 200 }}
          />
        </Form.Item>
      )}
    />
  );
}
