import { forwardRef } from 'react';
import { Alert, Form, FormInstance } from 'antd';

import { UserSelect } from '@/components/common';

export interface MergeUserFormData {
  sourceUserId: string;
  targetUserId: string;
}

export interface MergeUserFormProps {
  onSubmit?: (data: MergeUserFormData) => void;
}

export const MergeUserForm = forwardRef<FormInstance, MergeUserFormProps>(({ onSubmit }, ref) => {
  const [form] = Form.useForm<MergeUserFormData>();

  const sourceUserId = Form.useWatch('sourceUserId', form);

  const handleSubmit = (data: MergeUserFormData) => {
    onSubmit?.(data);
  };

  return (
    <Form ref={ref} form={form} layout="vertical" onFinish={handleSubmit}>
      <Alert
        type="info"
        description={
          <ol className="m-0 pl-4 list-disc">
            <li>合并后源用户将无法登录</li>
            <li>源用户的 authData、email 信息将转移到目标用户上</li>
            <li>源用户名下的工单将会转移至目标用户名下，该过程会持续一段时间</li>
          </ol>
        }
        style={{ marginBottom: 16 }}
      />
      <Form.Item
        name="sourceUserId"
        label="源用户"
        rules={[{ required: true }]}
        style={{ marginBottom: 16 }}
      >
        <UserSelect />
      </Form.Item>
      <Form.Item
        name="targetUserId"
        label="目标用户"
        rules={[
          {
            required: true,
            validator: (_rule, value) => {
              if (value === sourceUserId) {
                return Promise.reject('不能与源用户相同');
              }
              return Promise.resolve();
            },
          },
        ]}
        style={{ marginBottom: 0 }}
      >
        <UserSelect />
      </Form.Item>
    </Form>
  );
});
