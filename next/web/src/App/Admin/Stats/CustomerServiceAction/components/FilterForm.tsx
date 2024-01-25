import { forwardRef } from 'react';
import { Button, DatePicker, Form, FormInstance } from 'antd';
import { Moment } from 'moment';

import { CustomerServiceSelect } from '@/components/common';

export interface FilterFormData {
  dateRange: [Moment, Moment];
  operatorIds?: string[];
}

export interface FilterFormProps {
  initData?: Partial<FilterFormData>;
  onSubmit?: (data: FilterFormData) => void;
  loading?: boolean;
}

export const FilterForm = forwardRef<FormInstance, FilterFormProps>(
  ({ initData, onSubmit, loading }, ref) => {
    const handleSubmit = (data: FilterFormData) => {
      if (onSubmit) {
        if (data.operatorIds && data.operatorIds.length === 0) {
          delete data.operatorIds;
        }
        onSubmit(data);
      }
    };

    return (
      <Form
        ref={ref}
        className="flex flex-wrap gap-2"
        initialValues={initData}
        onFinish={handleSubmit}
      >
        <Form.Item noStyle name="dateRange">
          <DatePicker.RangePicker allowClear={false} />
        </Form.Item>

        <Form.Item noStyle name="operatorIds">
          <CustomerServiceSelect
            allowClear
            showArrow
            mode="multiple"
            placeholder="客服"
            style={{ minWidth: 200 }}
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading}>
          查询
        </Button>
      </Form>
    );
  }
);
