import { forwardRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Form, FormInstance } from 'antd';
import { pick } from 'lodash-es';

import { ViewConditions } from '@/App/Admin/Settings/Views/components/ViewConditions';
import { ViewSort } from '@/App/Admin/Settings/Views/components/ViewSort';
import { ViewSchema } from '@/api/view';

export type ViewFormData = Pick<ViewSchema, 'conditions' | 'sortBy' | 'sortOrder'>;

export interface ViewFormProps {
  initData?: ViewFormData;
  onSubmit?: (data: ViewFormData) => void;
}

export const ViewForm = forwardRef<FormInstance, ViewFormProps>(({ initData, onSubmit }, ref) => {
  const form = useForm<ViewFormData>({
    defaultValues: pick(initData, ['conditions', 'sortBy', 'sortOrder']),
  });

  return (
    <FormProvider {...form}>
      <Form ref={ref} layout="vertical" onFinish={onSubmit && form.handleSubmit(onSubmit)}>
        <ViewConditions />
        <ViewSort style={{ marginBottom: 0 }} />
      </Form>
    </FormProvider>
  );
});
