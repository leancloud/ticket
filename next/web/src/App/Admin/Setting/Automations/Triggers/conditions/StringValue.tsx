import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Form, Input, Select, Switch } from 'antd';
import { get } from 'lodash-es';

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

const valuesOp: Record<string, true | undefined> = {
  includesAny: true,
  notIncludesAll: true,
};

export function StringValue({ path }: { path: string }) {
  const { control, formState, setValue } = useFormContext();
  const op = useWatch({ control, name: `${path}.op` });

  const useValues = valuesOp[op];
  const errors = get(formState.errors, path);

  return (
    <>
      <Controller
        control={control}
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

      <Form.Item className="w-full" validateStatus={errors?.value ? 'error' : undefined}>
        {useValues ? (
          <Controller
            control={control}
            name={`${path}.value`}
            rules={{ required: true }}
            render={({ field }) => <Select {...field} mode="tags" placeholder="输入一个或多个值" />}
          />
        ) : (
          <Controller
            control={control}
            name={`${path}.value`}
            rules={{ required: true }}
            render={({ field }) => <Input {...field} placeholder="在此输入文本" />}
          />
        )}

        <label className="mt-1 flex items-center">
          <Controller
            control={control}
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
    </>
  );
}
