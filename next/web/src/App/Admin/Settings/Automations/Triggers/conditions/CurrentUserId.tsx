import { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { useGroups } from '@/api/group';
import { useCustomerServices } from '@/api/user';
import { Form, Select } from '@/components/antd';

export function CurrentUserId({ path }: { path: string }) {
  const { setValue } = useFormContext();
  const op = useWatch({ name: `${path}.op` });

  return (
    <>
      <Controller
        name={`${path}.op`}
        rules={{ required: true }}
        defaultValue="is"
        render={({ field, fieldState: { error } }) => (
          <Form.Item validateStatus={error ? 'error' : undefined}>
            <Select
              {...field}
              options={[
                { label: '是', value: 'is' },
                { label: '不是', value: 'isNot' },
                { label: '属于组', value: 'belongsToGroup' },
              ]}
              onChange={(value) => {
                field.onChange(value);
                setValue(`${path}.value`, undefined);
              }}
              style={{ width: 160 }}
            />
          </Form.Item>
        )}
      />

      {(op === 'is' || op === 'isNot') && <CustomerServiceSelect path={path} />}
      {op === 'belongsToGroup' && <GroupSelect path={path} />}
    </>
  );
}

function CustomerServiceSelect({ path }: { path: string }) {
  const { data: customerServices } = useCustomerServices();

  const options = useMemo(() => {
    const options = [{ label: '(客服)', value: '__customerService' }];
    if (customerServices) {
      customerServices.forEach(({ id, nickname }) => {
        options.push({ label: nickname, value: id });
      });
    }
    return options;
  }, [customerServices]);

  return (
    <Controller
      name={`${path}.value`}
      rules={{ required: true }}
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
  );
}

function GroupSelect({ path }: { path: string }) {
  const { data: groups } = useGroups();

  const options = useMemo(() => {
    return groups?.map((group) => ({ label: group.name, value: group.id }));
  }, [groups]);

  return (
    <Controller
      name={`${path}.value`}
      rules={{ required: true }}
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
  );
}
