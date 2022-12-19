import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Form, Input, Select, Switch } from '@/components/antd';

const OPS = [
  { label: '是', value: 'is' },
  { label: '不是', value: 'isNot' },
  { label: '包含', value: 'includes' },
  { label: '不包含', value: 'notIncludes' },
  { label: '包含这些词中的任意一个', value: 'includesAny' },
  { label: '没有这些词', value: 'notIncludesAll' },
  { label: '开头是', value: 'startsWith' },
  { label: '结尾是', value: 'endsWith' },
];

const tagsModeOp: Record<string, true | undefined> = {
  includesAny: true,
  notIncludesAll: true,
};

export function StringValue({ path }: { path: string }) {
  const { setValue } = useFormContext();
  const op = useWatch({ name: `${path}.op` });

  const isTagsMode = tagsModeOp[op];

  return (
    <>
      <Controller
        name={`${path}.op`}
        defaultValue="is"
        render={({ field }) => (
          <Select
            {...field}
            onChange={(op) => {
              setValue(`${path}.op`, op);
              setValue(`${path}.value`, undefined);
            }}
            options={OPS}
            style={{ width: 220 }}
          />
        )}
      />

      <Controller
        name={`${path}.value`}
        rules={{ required: true }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item className="w-full" validateStatus={error ? 'error' : undefined}>
            {isTagsMode ? (
              <Select {...field} mode="tags" placeholder="输入一个或多个值!" />
            ) : (
              <Input {...field} placeholder="在此输入文本" />
            )}

            <label className="mt-1 flex items-center">
              <Controller
                name={`${path}.caseSensitive`}
                defaultValue={undefined}
                render={({ field }) => (
                  <Switch
                    size="small"
                    checked={field.value}
                    onChange={(checked) => field.onChange(checked || undefined)}
                  />
                )}
              />
              <span className="ml-1">匹配大小写</span>
            </label>
          </Form.Item>
        )}
      />
    </>
  );
}
