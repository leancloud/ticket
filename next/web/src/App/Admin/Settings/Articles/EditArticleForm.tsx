import { Button, Checkbox, Form, FormInstance, Input, Popover } from 'antd';
import { CreateArticleData } from 'api/article';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { SiMarkdown } from 'react-icons/si';

export interface EditArticleProps {
  initData?: CreateArticleData;
  submitting?: boolean;
  onSubmit: (data: CreateArticleData) => void;
  onCancel?: () => void;
}

interface FormData extends Omit<CreateArticleData, 'private'> {
  public: boolean;
}

export function EditArticleForm({
  initData,
  submitting,
  onSubmit,
  onCancel,
}: EditArticleProps) {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: { ...initData, public: !initData?.private },
  });

  const $antForm = useRef<FormInstance>(null!);

  return (
    <div className="flex flex-col h-full">
      <div className="grow p-10 overflow-y-auto">
        <Form
          ref={$antForm}
          layout="vertical"
          onFinish={handleSubmit(({ ['public']: pblc, ...data }) =>
            onSubmit({ ...data, private: !pblc })
          )}
        >
          <Controller
            control={control}
            name="title"
            rules={{ required: '请填写此字段' }}
            defaultValue=""
            render={({ field, fieldState: { error } }) => (
              <Form.Item
                label="标题"
                htmlFor="title"
                validateStatus={error ? 'error' : undefined}
                help={error?.message}
                style={{ marginBottom: 16 }}
              >
                <Input {...field} id="title" autoFocus />
              </Form.Item>
            )}
          />
          <Form.Item
            label={
              <span className="inline-flex items-center">
                描述
                <Popover placement="right" content="支持 Markdown 语法">
                  <SiMarkdown className="ml-1 w-4 h-4" />
                </Popover>
              </span>
            }
            htmlFor="content"
            style={{ marginBottom: 16 }}
          >
            <Controller
              control={control}
              name="content"
              render={({ field }) => <Input.TextArea {...field} id="content" rows={8} />}
            />
          </Form.Item>
          <Form.Item>
            <Controller
              control={control}
              name="public"
              render={({ field: { value, onChange } }) => (
                <Checkbox checked={value} onChange={onChange} children="发布" />
              )}
            />
          </Form.Item>
        </Form>
      </div>

      <div className="flex flex-row-reverse px-10 py-4 border-t border-[#D8DCDE]">
        <Button type="primary" loading={submitting} onClick={() => $antForm.current.submit()}>
          保存
        </Button>
        <Button className="mr-4" disabled={submitting} type="link" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
}
