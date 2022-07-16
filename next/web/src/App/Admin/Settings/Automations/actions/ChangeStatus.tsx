import { Controller } from 'react-hook-form';

import { Form, Select } from '@/components/antd';
import { actions, OperateAction } from '@/api/op-log';

const labels: Record<OperateAction, string> = {
  replyWithNoContent: '无需回复（等待用户回复）',
  replySoon: '稍后回复（待客服跟进）',
  resolve: '待用户确认解决',
  close: '关闭工单',
  reopen: '重新打开工单',
};

const options = actions.map((action) => ({
  value: action,
  label: labels[action],
}));

export function ChangeStatus({ path }: { path: string }) {
  return (
    <Controller
      name={`${path}.value`}
      rules={{ required: true }}
      render={({ field, fieldState: { error } }) => (
        <Form.Item validateStatus={error ? 'error' : undefined}>
          <Select
            {...field}
            options={options}
            placeholder="请选择"
            optionFilterProp="label"
            style={{ width: 200 }}
          />
        </Form.Item>
      )}
    />
  );
}
