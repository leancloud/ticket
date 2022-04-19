import { useEffect, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Form, Select } from '@/components/antd';
import { useTagMetadatas } from '@/api/tag-metadata';

export function TagSelect({ name }: { name: string }) {
  const { register, setValue } = useFormContext();

  useEffect(() => {
    register(`${name}.private`);
  }, []);

  const tagKey = useWatch({ name: `${name}.key` });

  const { data } = useTagMetadatas();

  const tagKeyOptions = useMemo(() => {
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
        name={`${name}.key`}
        rules={{ required: '请填写此字段' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item validateStatus={error ? 'error' : undefined} help={error?.message}>
            <Select
              {...field}
              placeholder="标签"
              options={tagKeyOptions}
              onChange={(key) => {
                field.onChange(key);
                const tag = data!.find((t) => t.key === key);
                setValue(`${name}.private`, tag!.private);
                setValue(`${name}.value`, undefined);
              }}
            />
          </Form.Item>
        )}
      />

      {currentTag && (
        <Controller
          name={`${name}.value`}
          rules={{ required: '请填写此字段' }}
          render={({ field, fieldState: { error } }) => (
            <Form.Item validateStatus={error ? 'error' : undefined}>
              <Select {...field} placeholder="值" options={tagValueOptions} />
            </Form.Item>
          )}
        />
      )}
    </>
  );
}
