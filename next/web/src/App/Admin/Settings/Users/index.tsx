import { Controller, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';

import { Button, Form, Input, message } from '@/components/antd';
import { createUser, CreateUserData } from '@/api/user';

export function NewUser() {
  const { control, handleSubmit, reset } = useForm<CreateUserData>();

  const { mutate, isLoading } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      message.success('保存成功');
      reset();
    },
  });

  const submit = (data: CreateUserData) => {
    const { username, email } = data;
    if (!username && !email) {
      return message.error('请至少指定 Username 与 Email 中的一项');
    }
    return mutate(data);
  };

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">创建用户</h1>

      <Form layout="vertical" onFinish={handleSubmit(submit)}>
        <Controller
          control={control}
          name="username"
          render={({ field }) => (
            <Form.Item label="Username" htmlFor="username">
              <Input {...field} autoFocus id="username" />
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Form.Item label="Email" htmlFor="email">
              <Input type="email" {...field} id="email" />
            </Form.Item>
          )}
        />

        <Button type="primary" htmlType="submit" disabled={isLoading}>
          创建
        </Button>
      </Form>
    </div>
  );
}
