import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { Button, Divider, Form, Input } from '@/components/antd';
import { useMarkdownEditor } from '@/components/MarkdownEditor';
import { LocaleSelect } from '../../components/LocaleSelect';

interface NewTicketFormNoteFormData {
  name: string;
  language: string;
  content: string;
}

interface NewTicketFormNoteFormProps {
  data?: Partial<NewTicketFormNoteFormData>;
  onSubmit: (data: NewTicketFormNoteFormData) => void;
  submitting?: boolean;
}

export function NewTicketFormNoteForm({ data, onSubmit, submitting }: NewTicketFormNoteFormProps) {
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    reset,
    register,
    setValue,
    formState,
  } = useForm<NewTicketFormNoteFormData>();

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
      <Controller
        control={control}
        name="name"
        defaultValue=""
        rules={{ required: '请填写名称' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="名称"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <Input {...field} autoFocus />
          </Form.Item>
        )}
      />

      <Divider type="horizontal" plain>
        默认语言
      </Divider>

      <Controller
        control={control}
        name="language"
        rules={{ required: '语言不能为空' }}
        defaultValue="zh-cn"
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
            style={{ marginBottom: 16 }}
          >
            <LocaleSelect {...field} className="w-full" />
          </Form.Item>
        )}
      />

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
      </div>
    </Form>
  );
}

interface EditTicketFormNoteFormTranslationData {
  name: string;
}

interface EditTicketFormNoteFormProps {
  data?: Partial<EditTicketFormNoteFormTranslationData>;
  onSubmit: (data: EditTicketFormNoteFormTranslationData) => void;
  submitting?: boolean;
  active?: boolean;
  onChangeActive?: () => void;
  children?: ReactNode;
}

export function EditTicketFormNoteForm({
  data,
  onSubmit,
  submitting,
  active,
  onChangeActive,
  children,
}: EditTicketFormNoteFormProps) {
  const navigate = useNavigate();
  const { handleSubmit, reset, control } = useForm<EditTicketFormNoteFormTranslationData>();

  useEffect(() => {
    reset(data);
  }, [data, reset]);

  return (
    <Form
      layout="vertical"
      onFinish={() => {
        handleSubmit(onSubmit)();
      }}
    >
      <Controller
        control={control}
        name="name"
        defaultValue=""
        rules={{ required: '请填写名称' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="名称"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <Input {...field} autoFocus />
          </Form.Item>
        )}
      />

      {children}

      <div className="flex">
        <Button type="primary" htmlType="submit" loading={submitting}>
          保存
        </Button>
        <Button className="ml-2" onClick={() => navigate('../..')} disabled={submitting}>
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
