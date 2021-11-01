import { Controller, useFormContext } from 'react-hook-form';
import { get } from 'lodash-es';

import { Form } from '@/components/antd';
import { CategorySelect } from '../../components/CategorySelect';

export function UpdateCategoryId({ path }: { path: string }) {
  const { control, formState } = useFormContext();
  const errors = get(formState.errors, path);

  return (
    <Form.Item validateStatus={errors?.value ? 'error' : undefined}>
      <Controller
        control={control}
        name={`${path}.value`}
        rules={{ required: true }}
        render={({ field }) => <CategorySelect {...field} initValue={field.value} />}
      />
    </Form.Item>
  );
}
