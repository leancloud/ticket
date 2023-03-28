import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button, Form } from '@/components/antd';
import { useMarkdownEditor } from '@/components/MarkdownEditor';

interface TicketFormNoteTranslationFormData {
  content: string;
}

interface TicketFormNoteTranslationFormProps {
  data?: Partial<TicketFormNoteTranslationFormData>;
  onSubmit: (data: TicketFormNoteTranslationFormData) => void;
  submitting?: boolean;
  active?: boolean;
  onChangeActive?: () => void;
  onCancel?: () => void;
}

export function TicketFormNoteTranslationForm({
  data,
  onSubmit,
  submitting,
  active,
  onChangeActive,
  onCancel,
}: TicketFormNoteTranslationFormProps) {
  const navigate = useNavigate();
  const {
    handleSubmit,
    reset,
    register,
    setValue,
    formState,
  } = useForm<TicketFormNoteTranslationFormData>();

  const contentField = register('content', { required: '请填写内容' });
  const contentError = formState.errors.content;
  const [contentEditor, getContent, contentEditorRef] = useMarkdownEditor('');
  contentField.ref(contentEditorRef.current.TUIEditor);

  useEffect(() => {
    contentEditorRef.current.TUIEditor?.setMarkdown(data?.content ?? '', false);
    reset(data);
  }, [contentEditorRef, data, reset]);

  return (
    <Form
      layout="vertical"
      onFinish={() => {
        setValue('content', getContent() ?? '');
        handleSubmit(onSubmit)();
      }}
    >
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
        <Button className="ml-2" onClick={onCancel ?? (() => navigate('..'))} disabled={submitting}>
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
