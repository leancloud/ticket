import { Form, Input } from 'antd';
import { FC } from 'react';
import { Controller, Control } from 'react-hook-form';

export interface ArticleFormProps {
  control: Control<any, any>;
}

export const ArticleForm: FC<ArticleFormProps> = ({ control }) => (
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
);
