import { Controller } from 'react-hook-form';

import { Form, Select } from '@/components/antd';

const { Option } = Select;

const options = [
  { value: 50, label: '新工单' },
  { value: 120, label: '等待客服回复' },
  { value: 160, label: '已回复用户' },
  { value: 220, label: '待用户确认' },
  { value: 250, label: '已解决' },
  { value: 280, label: '已关闭' },
];

export function Status({ path }: { path: string }) {
  return (
    <>
      <Controller
        name={`${path}.op`}
        rules={{ required: true }}
        defaultValue="is"
        render={({ field }) => (
          <Form.Item>
            <Select {...field} style={{ width: 160 }}>
              <Option value="is">是</Option>
              <Option value="isNot">不是</Option>
            </Select>
          </Form.Item>
        )}
      />

      <Controller
        name={`${path}.value`}
        rules={{ required: true }}
        defaultValue={50}
        render={({ field, fieldState: { error } }) => (
          <Form.Item validateStatus={error ? 'error' : undefined}>
            <Select {...field} options={options} style={{ width: 160 }} />
          </Form.Item>
        )}
      />
    </>
  );
}
