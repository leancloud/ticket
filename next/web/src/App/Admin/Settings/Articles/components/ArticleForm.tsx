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
      >
        <Input {...field} id="title" autoFocus placeholder="标题" />
      </Form.Item>
    )}
  />
);
