import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useController, useForm } from 'react-hook-form';
import { Button, Form, Input } from '@/components/antd';
import { useMarkdownEditor } from '@/components/MarkdownEditor';

interface TicketFormNoteFormData {
  name: string;
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
  const {
    control,
    handleSubmit,
    reset,
    register,
    setValue,
    formState,
  } = useForm<TicketFormNoteFormData>();

  const {
    field: nameField,
    fieldState: { error: nameError },
  } = useController({
    control,
    name: 'name',
    defaultValue: '',
    rules: { required: '请填写名称' },
  });

  const contentField = register('content', { required: '请填写内容' });
  const contentError = formState.errors.content;
  const [contentEditor, getContent, contentEditorRef] = useMarkdownEditor('');
  contentField.ref(contentEditorRef.current.TUIEditor);

  useEffect(() => {
    contentEditorRef.current.TUIEditor?.setMarkdown(data?.content ?? '', false);
    reset(data);
  }, [data]);

  return (
    <Form
      layout="vertical"
      onFinish={() => {
        setValue('content', getContent() ?? '');
        handleSubmit(onSubmit)();
      }}
    >
      <Form.Item
        label="名称"
        validateStatus={nameError ? 'error' : undefined}
        help={nameError?.message}
      >
        <Input {...nameField} autoFocus />
      </Form.Item>

      <Form.Item
        label="内容"
        validateStatus={contentError ? 'error' : undefined}
        help={contentError?.message}
      >
        {contentEditor}
      </Form.Item>

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
