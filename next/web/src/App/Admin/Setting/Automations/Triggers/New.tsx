import { useHistory } from 'react-router-dom';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';

import { Button, Divider, Form, Input, Typography, message, notification } from '@/components/antd';
import { Condition, CreateTriggerData, createTrigger } from '@/api/trigger';
import { ConditionsField, ActionFields } from '../CustomFields';
import conditions from './conditions';
import actions from './actions';

const { Title } = Typography;

export interface TriggerFormProps {
  onSubmit: (data: CreateTriggerData) => void;
  onCancel: () => void;
  loading?: boolean;
  defaultValue?: any;
  submitButtonTitle?: string;
}

const DEFAULT_VALUE = {
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
};

export function TriggerForm({
  onSubmit,
  onCancel,
  loading,
  defaultValue = DEFAULT_VALUE,
  submitButtonTitle = '保存',
}: TriggerFormProps) {
  const methods = useForm<any>({
    defaultValues: defaultValue,
  });

  const {
    control,
    formState: { errors },
    handleSubmit,
  } = methods;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
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
            name="description"
            render={({ field }) => <Input {...field} placeholder="输入规则描述（可空）" />}
          />
        </Form.Item>

        <div className="mt-6">
          <div className="text-lg font-bold pb-2">满足以下条件时执行：</div>
          <ConditionsField name="conditions" config={conditions} />
        </div>

        <div className="mt-6">
          <div className="text-lg font-bold pb-2">执行这些操作：</div>
          <ActionFields name="actions" config={actions} />
        </div>

        <Divider />
        <div>
          <Button type="primary" htmlType="submit" loading={loading}>
            {submitButtonTitle}
          </Button>
          <Button className="ml-2" onClick={onCancel} disabled={loading}>
            取消
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

function encodeCondition(condition: Condition): Condition {
  if (condition.type === 'any' || condition.type === 'all') {
    if (condition.conditions.length === 1) {
      return encodeCondition(condition.conditions[0]);
    } else {
      return {
        ...condition,
        conditions: condition.conditions.map(encodeCondition),
      };
    }
  }
  return condition;
}

export default function NewTrigger() {
  const history = useHistory();

  const { mutate, isLoading } = useMutation({
    mutationFn: (data: CreateTriggerData) =>
      createTrigger({
        title: data.title,
        description: data.description,
        conditions: encodeCondition(data.conditions),
        actions: data.actions,
      }),
    onSuccess: () => {
      message.success('保存成功');
      history.push('.');
    },
    onError: (error: Error) => {
      console.error(error);
      notification.error({
        message: '创建失败',
        description: error.message,
      });
    },
  });

  return (
    <div>
      <div>
        <p className="text-sm text-[#6F7C87]">新规则：</p>
        <Title level={3}>流转触发器</Title>
      </div>
      <TriggerForm onSubmit={mutate} onCancel={() => history.push('.')} loading={isLoading} />
    </div>
  );
}
