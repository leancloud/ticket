import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { get } from 'lodash-es';

import { Form, NULL_STRING, Select } from '@/components/antd';
import { useGroups } from '@/api/group';

export function UpdateGroupId({ path }: { path: string }) {
  const { control, formState } = useFormContext();
  const errors = get(formState.errors, path);

  const { data: groups } = useGroups();
  const options = useMemo(() => {
    return [
      { label: '(未设置)', value: NULL_STRING },
      ...(groups?.map((g) => ({ label: g.name, value: g.id })) ?? []),
    ];
  }, [groups]);

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
