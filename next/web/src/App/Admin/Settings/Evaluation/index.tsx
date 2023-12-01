import { Fragment } from 'react';
import { Button, Checkbox, Form, InputNumber, Select } from 'antd';
import { merge } from 'lodash-es';

import { useConfig, useUpdateConfig } from '@/api/config';
import { LoadingCover } from '@/components/common';

const defaultValue = {
  timeLimit: 0,
  tag: {
    positive: {
      options: [],
      required: false,
    },
    negative: {
      options: [],
      required: false,
    },
  },
};

export function EvaluationConfig() {
  const { data, isLoading } = useConfig<{
    timeLimit: number;
    tag?: {
      positive?: {
        options: string[];
        required: boolean;
      };
      negative?: {
        options: string[];
        required: boolean;
      };
    };
  }>('evaluation');

  const { mutate, isLoading: isSaving } = useUpdateConfig('evaluation');

  return (
    <div className="p-10">
      {isLoading && <LoadingCover />}
      {!isLoading && (
        <Form
          layout="vertical"
          initialValues={merge({}, defaultValue, data)}
          onFinish={(data) => mutate(merge({}, defaultValue, data))}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            name="timeLimit"
            label="评价时限"
            extra="工单关闭后多长时间内允许用户评价，设为 0 表示没有限制"
            getValueProps={(value) => ({
              value: Math.floor(value / (1000 * 60 * 60)),
            })}
            getValueFromEvent={(value) => value * 1000 * 60 * 60}
          >
            <InputNumber min={0} addonAfter="小时" />
          </Form.Item>
          {[
            { name: 'positive', label: '好评选项' },
            { name: 'negative', label: '差评选项' },
          ].map(({ name, label }) => (
            <Fragment key={name}>
              <Form.Item
                name={['tag', name, 'options']}
                label={label}
                extra="可使用动态内容占位符"
                style={{ marginBottom: 0 }}
              >
                <Select mode="tags" />
              </Form.Item>
              <Form.Item
                name={['tag', name, 'required']}
                valuePropName="checked"
                initialValue={false}
              >
                <Checkbox>必选</Checkbox>
              </Form.Item>
            </Fragment>
          ))}
          <Button type="primary" htmlType="submit" loading={isSaving}>
            保存
          </Button>
        </Form>
      )}
    </div>
  );
}
