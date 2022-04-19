import { useEffect, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useTagMetadatas } from '@/api/tag-metadata';
import { Form, Select } from '@/components/antd';

export function TagSelect({ path }: { path: string }) {
  const { setValue, register } = useFormContext();

  useEffect(() => {
    register(`${path}.private`);
  }, []);

  const tagKey = useWatch({ name: `${path}.key` });

  const { data } = useTagMetadatas();

  const tagKeyoptions = useMemo(() => {
    return data?.filter((t) => t.type === 'select').map(({ key }) => ({ label: key, value: key }));
  }, [data]);

  const currentTag = useMemo(() => {
    return data?.find((t) => t.key === tagKey);
  }, [data, tagKey]);

  const tagValueOptions = useMemo(() => {
    return currentTag?.values?.map((value) => ({ label: value, value }));
  }, [currentTag]);

  return (
    <>
      <Controller
        name={`${path}.key`}
        rules={{ required: true }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item validateStatus={error ? 'error' : undefined}>
            <Select
              {...field}
              placeholder="标签"
              options={tagKeyoptions}
              onChange={(key) => {
                field.onChange(key);
                setValue(`${path}.value`, undefined);
                const tag = data!.find((t) => t.key === key);
                setValue(`${path}.private`, tag!.private);
              }}
              style={{ width: 200 }}
            />
          </Form.Item>
        )}
      />

      {currentTag && (
        <Controller
          name={`${path}.value`}
          rules={{ required: true }}
          render={({ field, fieldState: { error } }) => (
            <Form.Item validateStatus={error ? 'error' : undefined}>
              <Select
                {...field}
                placeholder="值"
                options={tagValueOptions}
                style={{ width: 200 }}
              />
            </Form.Item>
          )}
        />
      )}
    </>
  );
}
