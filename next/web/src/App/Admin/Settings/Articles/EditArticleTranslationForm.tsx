import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { UpdateArticleTranslationData } from '@/api/article';
import { Button, Checkbox, Form, FormInstance, Input } from '@/components/antd';
import { TranslationForm, TranslationFormRef } from './components/TranslationForm';

export interface EditArticleTranslationProps {
  initData?: UpdateArticleTranslationData;
  submitting?: boolean;
  onSubmit: (data: Omit<Required<UpdateArticleTranslationData>, 'language'>) => void;
  onCancel?: () => void;
  acceptComment?: boolean;
}

interface FormData extends Omit<Required<UpdateArticleTranslationData>, 'private' | 'language'> {
  public: boolean;
}

export function EditArticleTranslationForm({
  initData,
  submitting,
  onSubmit,
  onCancel,
  acceptComment = true,
}: EditArticleTranslationProps) {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: { ...initData, public: !initData?.private },
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
          onFinish={handleSubmit(({ ['public']: pblc, ...data }) =>
            onSubmit({
              ...data,
              content: ref.current?.getValue() ?? '',
              private: !pblc,
              comment,
            })
          )}
        >
          <TranslationForm control={control} content={initData?.content} ref={ref} />

          <Form.Item style={{ marginBottom: 0 }}>
            <Controller
              control={control}
              name="public"
              render={({ field: { value, onChange } }) => (
                <Checkbox checked={value} onChange={onChange} children="启用" />
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
