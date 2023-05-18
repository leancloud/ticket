import { useMarkdownEditor } from '@/components/MarkdownEditor';
import { Form, Input } from 'antd';
import { forwardRef, useImperativeHandle } from 'react';
import { Control, Controller } from 'react-hook-form';

export interface TranslationFormProps {
  control: Control<any, any>;
  content?: string;
}

export interface TranslationFormRef {
  getValue: () => string | undefined;
}

export const TranslationForm = forwardRef<TranslationFormRef, TranslationFormProps>(
  ({ control, content }, ref) => {
    const [editor, getValue] = useMarkdownEditor(content ?? '', {
      height: 'calc(100vh - 220px)',
    });

    useImperativeHandle(
      ref,
      () => ({
        getValue,
      }),
      [getValue]
    );

    return (
      <>
        <Controller
          control={control}
          name="title"
          rules={{ required: '请填写此字段' }}
          defaultValue=""
          render={({ field, fieldState: { error } }) => (
            <Form.Item
              label="标题"
              validateStatus={error ? 'error' : undefined}
              help={error?.message}
              style={{ marginBottom: 16 }}
            >
              <Input {...field} id="title" autoFocus />
            </Form.Item>
          )}
        />
        <Form.Item style={{ marginBottom: 16 }}>{editor}</Form.Item>
      </>
    );
  }
);
