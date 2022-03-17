import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';

import { LOCALES } from '@/i18n/locales';
import { Button, Form, Input, Select } from '@/components/antd';

const { TextArea } = Input;

export interface DynamicContentFormData {
  name: string;
  defaultLocale: string;
  content: string;
}

export interface DynamicContentFormProps {
  initData?: Partial<DynamicContentFormData>;
  submitting?: boolean;
  onSubmit: (data: DynamicContentFormData) => void;
}

export function DynamicContentForm({ initData, submitting, onSubmit }: DynamicContentFormProps) {
  const { control, handleSubmit } = useForm<DynamicContentFormData>({ defaultValues: initData });

  const localeOptions = useMemo(() => {
    return Object.entries(LOCALES).map(([value, label]) => ({ label, value }));
  }, []);

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name="name"
        rules={{
          required: '请填写名称',
          pattern: {
            value: /^[a-zA-Z0-9_]+$/,
            message: '请仅使用 A-Z、0-9、_',
          },
        }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="名称"
            htmlFor="dc_form_name"
            required
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <Input {...field} id="dc_form_name" autoFocus />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="defaultLocale"
        rules={{ required: '请填写默认语言' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="默认语言"
            htmlFor="dc_form_defaultLocale"
            extra="此动态内容项目的默认语言。"
            required
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <Select {...field} id="dc_form_defaultLocale" options={localeOptions} />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="content"
        rules={{ required: '请填写内容' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="内容"
            htmlFor="dc_form_content"
            extra="动态内容的文本。您也可以在您的文本中使用占位符。"
            required
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <TextArea {...field} id="dc_form_content" rows={10} />
          </Form.Item>
        )}
      />

      <div className="flex">
        <div className="grow"></div>
        <Link to="..">
          <Button type="link" disabled={submitting}>
            取消
          </Button>
        </Link>
        <Button className="ml-1" type="primary" htmlType="submit" loading={submitting}>
          创建
        </Button>
      </div>
    </Form>
  );
}
