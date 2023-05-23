import { ForwardedRef, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Controller, DefaultValues, UseFormReturn, useForm, useWatch } from 'react-hook-form';
import { omit } from 'lodash-es';

import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Form,
  FormInstance,
  Input,
  InputNumber,
} from '@/components/antd';
import { CategorySelect } from '@/components/common';

interface SupportEmailFormData {
  name: string;
  email: string;
  imap: {
    host: string;
    port: number;
    secure: boolean;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
  auth?: {
    username: string;
    password: string;
  };
  mailbox?: string;
  categoryId: string;
  receipt: {
    enabled: boolean;
    subject: string;
    text: string;
  };
}

const DEFAULT_VALUES: DefaultValues<SupportEmailFormData> = {
  imap: {
    port: 993,
    secure: true,
  },
  smtp: {
    port: 465,
    secure: true,
  },
  receipt: {
    enabled: false,
    subject: `Fwd: {{ ticket.title }}`,
    text: `您的请求已被受理。\n\n原始信息：\n-----\n{{ ticket.content }}\n-----\n`,
  },
};

export interface SupportEmailFormRef extends UseFormReturn<SupportEmailFormData> {
  submit: () => void;
}

interface SupportEmailFormProps {
  onSubmit: (data: SupportEmailFormData) => void;
  submitting?: boolean;
}

function SupportEmailFormWithoutRef(
  { onSubmit, submitting }: SupportEmailFormProps,
  ref: ForwardedRef<SupportEmailFormRef>
) {
  const methods = useForm<SupportEmailFormData>({
    defaultValues: DEFAULT_VALUES,
  });
  const { control } = methods;

  const receiptEnabled = useWatch({ control, name: 'receipt.enabled' });

  const formRef = useRef<FormInstance>(null!);

  useImperativeHandle(ref, () => ({
    ...methods,
    submit: formRef.current.submit,
  }));

  const [usernameChanged, setUsernameChanged] = useState(false);

  const handleSubmit = methods.handleSubmit((data) => {
    if (usernameChanged) {
      onSubmit(data);
    } else {
      onSubmit(omit(data, 'auth'));
    }
  });

  return (
    <div className="relative">
      <Form ref={formRef} layout="vertical" onFinish={handleSubmit}>
        <Controller
          control={control}
          name="name"
          rules={{ required: true }}
          render={({ field, fieldState }) => (
            <Form.Item
              label="名称"
              extra="将作为回复用户时的发件人名称"
              {...getValidateState(fieldState)}
            >
              <Input {...field} autoFocus />
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="email"
          rules={{ required: true }}
          render={({ field, fieldState }) => (
            <Form.Item label="地址" {...getValidateState(fieldState)}>
              <Input {...field} placeholder="support@example.com" />
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="mailbox"
          render={({ field }) => (
            <Form.Item label="邮箱" extra="请填写完整邮箱路径">
              <Input {...field} placeholder="INBOX" />
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="categoryId"
          rules={{ required: true }}
          render={({ field, fieldState }) => (
            <Form.Item
              {...getValidateState(fieldState)}
              label="分类"
              extra="通过该邮箱创建的工单将自动分配到所选分类"
            >
              <CategorySelect {...field} categoryActive />
            </Form.Item>
          )}
        />

        <Divider>邮件服务器</Divider>

        <div className="flex gap-4">
          <Controller
            control={control}
            name="imap.host"
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <Form.Item className="grow" label="接收邮件服务器" {...getValidateState(fieldState)}>
                <Input {...field} placeholder="imap.example.com" />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="imap.port"
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <Form.Item label="端口号" {...getValidateState(fieldState)}>
                <InputNumber {...field} />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="imap.secure"
            render={({ field }) => (
              <Form.Item label="SSL">
                <Checkbox checked={field.value} onChange={field.onChange}>
                  启用
                </Checkbox>
              </Form.Item>
            )}
          />
        </div>

        <div className="flex gap-4">
          <Controller
            control={control}
            name="smtp.host"
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <Form.Item className="grow" label="发送邮件服务器" {...getValidateState(fieldState)}>
                <Input {...field} placeholder="smtp.example.com" />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="smtp.port"
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <Form.Item label="端口号" {...getValidateState(fieldState)}>
                <InputNumber {...field} />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="smtp.secure"
            render={({ field }) => (
              <Form.Item label="SSL">
                <Checkbox checked={field.value} onChange={field.onChange}>
                  启用
                </Checkbox>
              </Form.Item>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Controller
            control={control}
            name="auth.username"
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <Form.Item label="账户名" {...getValidateState(fieldState)}>
                <Input
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setUsernameChanged(true);
                  }}
                />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="auth.password"
            rules={{ required: usernameChanged }}
            render={({ field, fieldState }) => (
              <Form.Item label="密码" {...getValidateState(fieldState)}>
                <Input.Password {...field} />
              </Form.Item>
            )}
          />
        </div>

        <Divider>回执</Divider>

        <Alert
          type="info"
          message={
            <div>
              <div>工单创建完成后立即向用户发送一封邮件。可在回执中使用以下占位符：</div>
              <div>{'{{ ticket.title }} {{ ticket.content }}'}</div>
            </div>
          }
        />

        <div className="my-6">
          <Controller
            control={control}
            name="receipt.enabled"
            render={({ field }) => (
              <Checkbox checked={field.value} onChange={field.onChange}>
                启用回执
              </Checkbox>
            )}
          />
        </div>

        <Controller
          control={control}
          name="receipt.subject"
          rules={{ required: receiptEnabled }}
          render={({ field, fieldState }) => (
            <Form.Item label="主题" {...getValidateState(fieldState)}>
              <Input {...field} />
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="receipt.text"
          rules={{ required: receiptEnabled }}
          render={({ field, fieldState }) => (
            <Form.Item label="正文" {...getValidateState(fieldState)}>
              <Input.TextArea {...field} autoSize />
            </Form.Item>
          )}
        />

        <div className="space-x-2">
          <Button type="primary" htmlType="submit" loading={submitting}>
            保存
          </Button>
          <Link to="..">
            <Button disabled={submitting}>返回</Button>
          </Link>
        </div>
      </Form>
    </div>
  );
}

export const SupportEmailForm = forwardRef(SupportEmailFormWithoutRef);

function getValidateState({ error }: { error?: { message?: string } }) {
  if (error) {
    return {
      validateStatus: 'error' as const,
      help: error.message,
    };
  }
}
