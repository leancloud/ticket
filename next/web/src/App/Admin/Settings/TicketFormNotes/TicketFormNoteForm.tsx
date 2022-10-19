import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input } from '@/components/antd';
import { Controller, useForm } from 'react-hook-form';

interface TicketFormNoteFormData {
  title: string;
  content: string;
}

interface TicketFormNoteFormProps {
  data?: Partial<TicketFormNoteFormData>;
  onSubmit: (data: TicketFormNoteFormData) => void;
  submitting?: boolean;
  active?: boolean;
  onChangeActive?: () => void;
}

export function TicketFormNoteForm({
  data,
  onSubmit,
  submitting,
  active,
  onChangeActive,
}: TicketFormNoteFormProps) {
  const navigate = useNavigate();
  const { control, handleSubmit, reset } = useForm<TicketFormNoteFormData>();

  useEffect(() => reset(data), [data]);

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name="title"
        defaultValue=""
        rules={{ required: '请填写标题' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="标题"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <Input {...field} autoFocus />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="content"
        defaultValue=""
        rules={{ required: '请填写内容' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="内容"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <Input.TextArea {...field} autoSize />
          </Form.Item>
        )}
      />

      <div className="flex">
        <Button type="primary" htmlType="submit" loading={submitting}>
          保存
        </Button>
        <Button className="ml-2" onClick={() => navigate('..')} disabled={submitting}>
          返回
        </Button>
        <div className="grow" />
        {onChangeActive && (
          <Button danger={active} onClick={onChangeActive} disabled={submitting}>
            {active ? '取消激活' : '激活'}
          </Button>
        )}
      </div>
    </Form>
  );
}
