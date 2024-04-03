import { useEffect } from 'react';
import { useMutation, useQuery } from 'react-query';
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { Button, Checkbox, Divider, Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { MdOutlineClose } from 'react-icons/md';

import {
  EmailNotificationEvent,
  SetEmailNotificationData,
  getEmailNotification,
  removeEmailNotification,
  setEmailNotification,
} from '@/api/email-notification';
import { LoadingCover } from '@/components/common';

const DEFAULT_VALUES = {
  send: {
    smtp: {
      port: 465,
      secure: true,
    },
  },
  events: [],
};

const EVENTS: EmailNotificationEvent[] = ['ticketRepliedByCustomerService'];

const EVENT_NAME: Record<EmailNotificationEvent, string> = {
  ticketRepliedByCustomerService: '客服回复工单',
};

interface EventConfigProps {
  index: number;
}

function EventConfig({ index }: EventConfigProps) {
  const { setValue } = useFormContext();

  const message = useWatch({ name: `events.${index}.message` });

  const htmlMode = !!message?.html;

  const handleChangeHtmlMode = (htmlMode: boolean) => {
    const content = message.html ?? message.text;
    if (htmlMode) {
      setValue(`events.${index}.message`, { html: content });
    } else {
      setValue(`events.${index}.message`, { text: content });
    }
  };

  return (
    <>
      <Controller
        name={`events.${index}.type`}
        render={({ field, fieldState: { error } }) => (
          <Form.Item label="类型" validateStatus={error ? 'error' : undefined}>
            <Select
              {...field}
              options={[{ label: '客服回复工单', value: 'ticketRepliedByCustomerService' }]}
            />
          </Form.Item>
        )}
      />
      <Controller
        name={`events.${index}.from`}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="发件人"
            extra="留空时使用账户名"
            validateStatus={error ? 'error' : undefined}
          >
            <Input {...field} />
          </Form.Item>
        )}
      />
      <Controller
        name={`events.${index}.to`}
        rules={{ required: true }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item label="收件人" validateStatus={error ? 'error' : undefined}>
            <Input {...field} />
          </Form.Item>
        )}
      />
      <Controller
        name={`events.${index}.subject`}
        rules={{ required: true }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item label="主题" validateStatus={error ? 'error' : undefined}>
            <Input {...field} />
          </Form.Item>
        )}
      />
      <Controller
        key={htmlMode ? 'html' : 'text'}
        name={`events.${index}.message.${htmlMode ? 'html' : 'text'}`}
        rules={{ required: true }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="正文"
            validateStatus={error ? 'error' : undefined}
            style={{ marginBottom: 0 }}
          >
            <Input.TextArea {...field} autoSize={{ minRows: 3 }} />
            <div className="mt-2">
              <Checkbox checked={htmlMode} onChange={(e) => handleChangeHtmlMode(e.target.checked)}>
                HTML 模式
              </Checkbox>
            </div>
          </Form.Item>
        )}
      />
    </>
  );
}

export function EmailNotification() {
  const form = useForm<SetEmailNotificationData>({
    defaultValues: DEFAULT_VALUES,
  });

  const { fields: events, append: addEvent, remove: removeEvent } = useFieldArray({
    control: form.control,
    name: 'events',
  });

  const handleAddEvent = () => {
    addEvent({
      type: 'ticketRepliedByCustomerService',
      to: '',
      subject: '',
      message: {
        text: '',
      },
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['EmailNotification'],
    queryFn: getEmailNotification,
  });

  const { mutate, isLoading: isSaving } = useMutation({
    mutationFn: setEmailNotification,
    onSuccess: () => {
      message.success('已保存');
    },
  });

  const { mutateAsync: remove } = useMutation({
    mutationFn: removeEmailNotification,
    onSuccess: () => {
      message.success('已移除');
    },
  });

  const handleSubmit = (data: SetEmailNotificationData) => {
    if (!data.send.smtp.password) {
      data.send.smtp.password = undefined;
    }
    mutate(data);
  };

  const handleRemove = () => {
    Modal.confirm({
      title: '移除邮件通知',
      content: '已设置的数据将会丢失，该操作不课恢复。',
      okButtonProps: { danger: true },
      onOk: remove,
    });
  };

  useEffect(() => {
    if (data) form.reset(data);
  }, [data]);

  return (
    <div className="p-10 max-w-[1000px] mx-auto">
      <h1 className="text-[#2f3941] text-[26px] font-normal mb-5">邮件通知</h1>

      {isLoading && <LoadingCover />}

      <FormProvider {...form}>
        <Form layout="vertical" onFinish={form.handleSubmit(handleSubmit)}>
          <div className="flex gap-4">
            <Controller
              name="send.smtp.host"
              rules={{ required: true }}
              render={({ field, fieldState: { error } }) => (
                <Form.Item
                  className="grow"
                  label="发送邮件服务器"
                  validateStatus={error ? 'error' : undefined}
                >
                  <Input {...field} placeholder="smtp.example.com" />
                </Form.Item>
              )}
            />
            <Controller
              name="send.smtp.port"
              rules={{ required: true }}
              render={({ field, fieldState: { error } }) => (
                <Form.Item label="端口号" validateStatus={error ? 'error' : undefined}>
                  <InputNumber {...field} />
                </Form.Item>
              )}
            />
            <Controller
              name="send.smtp.secure"
              render={({ field }) => (
                <Form.Item label="SSL">
                  <Checkbox checked={field.value} onChange={field.onChange}>
                    启用
                  </Checkbox>
                </Form.Item>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="send.smtp.username"
              rules={{ required: true }}
              render={({ field, fieldState: { error } }) => (
                <Form.Item label="账户名" validateStatus={error ? 'error' : undefined}>
                  <Input {...field} />
                </Form.Item>
              )}
            />

            <Controller
              name="send.smtp.password"
              rules={{
                required: !data, // password is required for first setting
              }}
              render={({ field, fieldState: { error } }) => (
                <Form.Item label="密码" validateStatus={error ? 'error' : undefined}>
                  <Input.Password {...field} placeholder={data ? '如需修改密码请填写' : ''} />
                </Form.Item>
              )}
            />
          </div>

          <Divider>发送事件</Divider>

          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id} className="border p-4 rounded relative">
                <button
                  className="absolute top-0 right-0 p-1"
                  type="button"
                  onClick={() => removeEvent(index)}
                >
                  <MdOutlineClose className="w-4 h-4" />
                </button>
                <EventConfig index={index} />
              </div>
            ))}

            <button
              className="border border-dashed hover:border-primary rounded w-full py-4"
              type="button"
              onClick={handleAddEvent}
            >
              添加
            </button>
          </div>

          <div className="mt-8 space-x-2">
            <Button type="primary" htmlType="submit" loading={isSaving}>
              保存
            </Button>
            <Button danger htmlType="button" onClick={handleRemove}>
              移除
            </Button>
          </div>
        </Form>
      </FormProvider>
    </div>
  );
}
