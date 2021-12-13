import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';

import { Button, Divider, Form, Input } from '@/components/antd';
import { ConditionsGroup } from './Conditions';
import { Actions } from './Actions';

export interface TriggerData {
  title: string;
  description: string;
  conditions: any;
  actions: any;
}

const DEFAULT_VALUES: Partial<TriggerData> = {
  conditions: {
    type: 'any',
    conditions: [{ type: 'any', conditions: [{}] }],
  },
  actions: [{}],
};

export interface TriggerFormProps {
  conditions: any;
  actions: any;
  onSubmit: (data: TriggerData) => any;
  onCancel: () => void;
  defaultValues?: Partial<TriggerData>;
  submitButtonText?: string;
  typeSelectWidth?: number;
}

export function TriggerForm({
  conditions,
  actions,
  onSubmit,
  onCancel,
  defaultValues = DEFAULT_VALUES,
  submitButtonText = '保存',
  typeSelectWidth,
}: TriggerFormProps) {
  const methods = useForm<TriggerData>({ defaultValues });
  const {
    control,
    formState: { errors },
    handleSubmit,
  } = methods;

  const [submitting, setSubmitting] = useState(false);
  const _handleSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={_handleSubmit}>
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
          <ConditionsGroup
            config={conditions}
            name="conditions"
            typeSelectWidth={typeSelectWidth}
          />
        </div>

        <div className="mt-6">
          <div className="text-lg font-bold pb-2">执行这些操作：</div>
          <Actions config={actions} name="actions" />
        </div>

        <Divider />
        <div>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {submitButtonText}
          </Button>
          <Button className="ml-2" onClick={onCancel} disabled={submitting}>
            取消
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
