import { forwardRef } from 'react';
import { Form, FormInstance, Input } from 'antd';

import { CSRole } from '@/api/customer-service';
import { RoleCheckboxGroup } from '@/App/Admin/components/RoleCheckboxGroup';

export interface CustomerServiceFormData {
  nickname?: string;
  email?: string;
  roles?: CSRole[];
}

export interface CustomerServiceFormProps {
  initData?: Partial<CustomerServiceFormData>;
  onSubmit?: (data: CustomerServiceFormData) => void;
  fields?: {
    nickname?: boolean;
    email?: boolean;
    roles?: boolean;
  };
}

const DEFAULT_FIELDS: Exclude<CustomerServiceFormProps['fields'], undefined> = {
  nickname: true,
  email: true,
  roles: true,
};

export const CustomerServiceForm = forwardRef<FormInstance, CustomerServiceFormProps>(
  ({ initData, onSubmit, fields = DEFAULT_FIELDS }, ref) => {
    const handleSubmit = (data: CustomerServiceFormData) => {
      onSubmit?.({
        nickname: data.nickname || undefined,
        email: data.email || undefined,
        roles: data.roles || [],
      });
    };

    return (
      <Form ref={ref} layout="vertical" initialValues={initData} onFinish={handleSubmit}>
        {fields.nickname && (
          <Form.Item name="nickname" label="昵称">
            <Input />
          </Form.Item>
        )}
        {fields.email && (
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
        )}
        {fields.roles && (
          <Form.Item
            name="roles"
            label="角色"
            rules={[{ type: 'array', min: 1 }]}
            style={{ marginBottom: 0 }}
          >
            <RoleCheckboxGroup />
          </Form.Item>
        )}
      </Form>
    );
  }
);
