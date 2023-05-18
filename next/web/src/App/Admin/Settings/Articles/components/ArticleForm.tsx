import { Controller, Control } from 'react-hook-form';

import { Checkbox, Form, Input } from '@/components/antd';

export interface ArticleFormProps {
  control: Control<any, any>;
}

export function ArticleForm({ control }: ArticleFormProps) {
  return (
    <>
      <Controller
        control={control}
        name="name"
        rules={{ required: '请填写此字段' }}
        defaultValue=""
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
            style={{ marginBottom: 16 }}
            label="名称"
          >
            <Input {...field} id="name" autoFocus placeholder="名称" />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="private"
        render={({ field: { value, onChange } }) => (
          <Form.Item style={{ marginBottom: 16 }}>
            <Checkbox checked={!value} onChange={(value) => onChange(!value)} children="发布" />
          </Form.Item>
        )}
      />
    </>
  );
}
