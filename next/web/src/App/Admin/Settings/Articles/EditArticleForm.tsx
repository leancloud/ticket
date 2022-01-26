import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { SiMarkdown } from 'react-icons/si';
import '@toast-ui/editor/dist/toastui-editor.css';
import { Editor } from '@toast-ui/react-editor';
import { useLocalStorage } from 'react-use';

import { UpsertArticleData } from '@/api/article';
import { Button, Checkbox, Form, FormInstance, Input, Popover } from '@/components/antd';
import { useMarkdownEditor } from '@/components/MarkdownEditor';

export interface EditArticleProps {
  initData?: UpsertArticleData;
  submitting?: boolean;
  onSubmit: (data: UpsertArticleData) => void;
  onCancel?: () => void;
  acceptComment?: boolean;
}

interface FormData extends Omit<UpsertArticleData, 'private'> {
  public: boolean;
}

export function EditArticleForm({
  initData,
  submitting,
  onSubmit,
  onCancel,
  acceptComment = true,
}: EditArticleProps) {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: { ...initData, public: !initData?.private },
  });

  const $antForm = useRef<FormInstance>(null!);
  const [comment, setComment] = useState('');

  const [editor, getValue] = useMarkdownEditor(initData?.content ?? '', {
    height: 'calc(100vh - 220px)',
  });

  return (
    <div className="flex flex-col h-full">
      <div className="grow py-6 px-10 overflow-y-auto">
        <Form
          ref={$antForm}
          layout="vertical"
          onFinish={handleSubmit(({ ['public']: pblc, ...data }) =>
            onSubmit({
              ...data,
              content: getValue() ?? '',
              private: !pblc,
              comment,
            })
          )}
        >
          <Controller
            control={control}
            name="title"
            rules={{ required: '请填写此字段' }}
            defaultValue=""
            render={({ field, fieldState: { error } }) => (
              <Form.Item
                validateStatus={error ? 'error' : undefined}
                help={error?.message}
                style={{ marginBottom: 16 }}
              >
                <Input {...field} id="title" autoFocus placeholder="标题" />
              </Form.Item>
            )}
          />
          <Form.Item style={{ marginBottom: 16 }}>{editor}</Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
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
        {acceptComment && (
          <Input
            className="!mr-6"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="为此次改动添加注释"
          />
        )}
      </div>
    </div>
  );
}
