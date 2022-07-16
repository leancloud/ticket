import { Controller, useFormContext } from 'react-hook-form';
import { get } from 'lodash-es';

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
  const { control, formState } = useFormContext();
  const errors = get(formState.errors, path);

  return (
    <Form.Item validateStatus={errors?.value ? 'error' : undefined}>
      <Controller
        control={control}
        name={`${path}.value`}
        rules={{ validate: (value) => value !== undefined }}
        render={({ field }) => (
          <Select
            {...field}
            options={options}
            placeholder="请选择"
            optionFilterProp="label"
            style={{ width: 200 }}
          />
        )}
      />
    </Form.Item>
  );
}
