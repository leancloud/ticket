import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Form, Select } from 'antd';
import { get } from 'lodash-es';

import { useGroups } from '@/api/group';

export function UpdateGroupId({ path }: { path: string }) {
  const { control, formState } = useFormContext();
  const errors = get(formState.errors, path);

  const { data: groups } = useGroups();
  const options = useMemo(() => {
    return [
      { label: '(未设置)', value: '' },
      ...(groups?.map((g) => ({ label: g.name, value: g.id })) ?? []),
    ];
  }, [groups]);

  return (
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
  );
}
