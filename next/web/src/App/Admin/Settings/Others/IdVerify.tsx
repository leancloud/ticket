import { useState } from 'react';
import { http } from '@/leancloud';
import { Button, Form, Input } from 'antd';
import { useMutation } from 'react-query';

export const IDVerify = () => {
  const [result, setResult] = useState<string>('');

  const { mutate: verify, isLoading } = useMutation({
    mutationFn: (value) => http.post('/api/2/id-verify', {}, { params: value }),
    onMutate: () => setResult(''),
    onSuccess: (response) => {
      if (response.data.status !== undefined) {
        setResult(response.data.status === 0 ? '✅ 该身份证号已通过实名校验' : '❌ 实名信息无效');
      }
      if (response.data.message) {
        setResult(response.data.message ?? response.data.code);
      }
    },
    onError: (error) => {
      if (error instanceof Error) {
        setResult(`🚫 ${error.message}`);
      }
    },
  });

  return (
    <div className="mb-4">
      <h4 className="ant-typography">实名认证</h4>
      <Form name="basic" layout="vertical" onFinish={verify} autoComplete="off">
        <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请提供真实姓名' }]}>
          <Input />
        </Form.Item>

        <Form.Item
          label="身份证号"
          name="id"
          rules={[{ required: true, message: '请提供身份证号' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading} disabled={isLoading}>
            验证
          </Button>
        </Form.Item>

        <Form.Item>{result}</Form.Item>
      </Form>
    </div>
  );
};
