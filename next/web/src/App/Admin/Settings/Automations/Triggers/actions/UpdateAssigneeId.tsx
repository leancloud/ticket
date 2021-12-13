import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { get } from 'lodash-es';

import { Form, Select } from '@/components/antd';
import { useCustomerServices } from '@/api/user';

const NULL_STRING = '';

export function UpdateAssigneeId({ path }: { path: string }) {
  const { control, formState } = useFormContext();
  const errors = get(formState.errors, path);

  const { data: assignees } = useCustomerServices();
  const options = useMemo(() => {
    return [
      { label: '(未设置)', value: NULL_STRING },
      { label: '(当前用户)', value: '__currentUser' },
      ...(assignees?.map((u) => ({ label: u.nickname, value: u.id })) ?? []),
    ];
  }, [assignees]);

  return (
    <Form.Item validateStatus={errors?.value ? 'error' : undefined}>
      <Controller
        control={control}
        name={`${path}.value`}
        rules={{ validate: (value) => value !== undefined }}
        render={({ field }) => (
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
        )}
      />
    </Form.Item>
  );
}
