import { Button, Divider, Form, Input, Typography } from 'antd';
import { useHistory } from 'react-router-dom';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { DevTool } from '@hookform/devtools';

import { ConditionsField, ActionFields } from '../CustomFields';
import conditions from './conditions';
import actions from './actions';

const { Title } = Typography;

interface TriggerFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

function TriggerForm({ onSubmit, onCancel }: TriggerFormProps) {
  const methods = useForm<any>({
    shouldUnregister: true,
    defaultValues: {
      title: 'temp title',
      content: '',
      conditions: {
        type: 'any',
        conditions: [
          {
            type: 'any',
            conditions: [{}],
          },
        ],
      },
      actions: [{}],
    },
  });

  const {
    control,
    formState: { errors },
    handleSubmit,
  } = methods;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <p className="text-sm text-[#6F7C87]">新规则：</p>
          <Title level={3}>流转触发器</Title>
        </div>

        <Form.Item className="mt-6" validateStatus={errors.title ? 'error' : undefined}>
          <div className="text-lg font-bold pb-2">规则名称</div>
          <Controller
            control={control}
            name="title"
            rules={{ required: true }}
            render={({ field }) => <Input {...field} placeholder="输入规则名称" />}
          />
        </Form.Item>

        <Form.Item className="mt-6">
          <div className="text-lg font-bold pb-2">规则描述</div>
          <Controller
            control={control}
            name="content"
            render={({ field }) => <Input {...field} placeholder="输入规则描述（可空）" />}
          />
        </Form.Item>

        <div className="mt-6">
          <div className="text-lg font-bold pb-2">满足以下条件时执行：</div>
          <ConditionsField path="conditions" config={conditions} />
        </div>

        <div className="mt-6">
          <div className="text-lg font-bold pb-2">执行这些操作：</div>
          <ActionFields name="actions" config={actions} />
        </div>

        <Divider />
        <div>
          <Button type="primary" htmlType="submit">
            保存
          </Button>
          <Button className="ml-2" onClick={onCancel}>
            取消
          </Button>
        </div>
      </form>

      <DevTool control={methods.control} />
    </FormProvider>
  );
}

export default function NewTrigger() {
  const history = useHistory();

  return (
    <TriggerForm
      onSubmit={(data) => console.log(JSON.stringify(data, null, 2))}
      onCancel={() => history.push('.')}
    />
  );
}
