import { useConfig, useUpdateConfig } from '@/api/config';
import { LoadingCover } from '@/components/common';
import { Button, Form, InputNumber } from 'antd';

export function EvaluationConfig() {
  const { data, isLoading } = useConfig<{ timeLimit: number }>('evaluation');

  const { mutate, isLoading: isSaving } = useUpdateConfig('evaluation');

  return (
    <div className="p-10">
      {isLoading && <LoadingCover />}
      {!isLoading && (
        <Form
          layout="vertical"
          initialValues={{
            ...data,
            timeLimit: Math.floor((data?.timeLimit || 0) / 1000 / 60),
          }}
          onFinish={(data) =>
            mutate({
              ...data,
              timeLimit: data.timeLimit * 1000 * 60,
            })
          }
        >
          <Form.Item
            name="timeLimit"
            label="评价时限"
            extra="工单关闭后多长时间内允许用户评价，设为 0 表示没有限制"
          >
            <InputNumber min={0} addonAfter="分钟" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={isSaving}>
            保存
          </Button>
        </Form>
      )}
    </div>
  );
}
