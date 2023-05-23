import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Form, FormInstance, Input } from '@/components/antd';
import { TranslationForm, TranslationFormRef } from './components/TranslationForm';

interface FormData {
  title: string;
  content: string;
  comment?: string;
}

export interface EditArticleTranslationProps {
  initData?: Partial<FormData>;
  submitting?: boolean;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  acceptComment?: boolean;
}

export function EditArticleTranslationForm({
  initData,
  submitting,
  onSubmit,
  onCancel,
  acceptComment = true,
}: EditArticleTranslationProps) {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: initData,
  });

  const $antForm = useRef<FormInstance>(null!);
  const [comment, setComment] = useState('');

  const ref = useRef<TranslationFormRef>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="grow py-6 px-10 overflow-y-auto">
        <Form
          ref={$antForm}
          layout="vertical"
          onFinish={handleSubmit((data) =>
            onSubmit({
              ...data,
              content: ref.current?.getValue() ?? '',
              comment: acceptComment ? comment : undefined,
            })
          )}
        >
          <TranslationForm control={control} content={initData?.content} ref={ref} />
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
