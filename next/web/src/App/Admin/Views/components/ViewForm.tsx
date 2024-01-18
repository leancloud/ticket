import { forwardRef, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Form, FormInstance } from 'antd';

import { ViewSchema } from '@/api/view';
import { ViewConditions } from '@/App/Admin/Settings/Views/components/ViewConditions';
import { ViewSort } from '@/App/Admin/Settings/Views/components/ViewSort';
import { decodeCondition, encodeCondition } from '@/App/Admin/Settings/Automations/utils';

export type ViewFormData = Pick<ViewSchema, 'conditions' | 'sortBy' | 'sortOrder'>;

export interface ViewFormProps {
  initData?: ViewFormData;
  onSubmit?: (data: ViewFormData) => void;
}

export const ViewForm = forwardRef<FormInstance, ViewFormProps>(({ initData, onSubmit }, ref) => {
  const defaultValues = useMemo<ViewFormData | undefined>(() => {
    if (initData) {
      return {
        ...initData,
        conditions: decodeCondition(initData.conditions),
      };
    }
  }, [initData]);

  const form = useForm({ defaultValues });

  const handleSubmit = form.handleSubmit((data) => {
    if (onSubmit) {
      onSubmit({
        ...data,
        conditions: encodeCondition(data.conditions),
      });
    }
  });

  return (
    <FormProvider {...form}>
      <Form ref={ref} layout="vertical" onFinish={handleSubmit}>
        <ViewConditions />
        <ViewSort style={{ marginBottom: 0 }} />
      </Form>
    </FormProvider>
  );
});
