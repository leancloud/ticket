import { FC, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { CreateArticleData, UpdateArticleData } from '@/api/article';
import { Button, Form, FormInstance } from '@/components/antd';
import { LocaleSelect } from '../../components/LocaleSelect';
import { TranslationForm, TranslationFormRef } from './components/TranslationForm';
import { ArticleForm } from './components/ArticleForm';

export interface NewArticleFormProps {
  submitting?: boolean;
  onSubmit: (data: CreateArticleData) => void;
  onCancel?: () => void;
}

export const NewArticleForm: FC<NewArticleFormProps> = ({ submitting, onSubmit, onCancel }) => {
  const { control, handleSubmit } = useForm<CreateArticleData>({
    defaultValues: {
      publishedFrom: new Date(0).toISOString(),
      publishedTo: new Date(0).toISOString(),
    },
  });

  const $antForm = useRef<FormInstance>(null!);
  const translationFormRef = useRef<TranslationFormRef>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="grow py-6 px-10 overflow-y-auto">
        <Form
          ref={$antForm}
          layout="vertical"
          onFinish={handleSubmit((data) => {
            onSubmit({
              ...data,
              publishedFrom: data.publishedFrom ?? undefined,
              publishedTo: data.publishedTo ?? undefined,
              content: translationFormRef.current?.getValue() ?? '',
            });
          })}
        >
          <ArticleForm control={control} />

          <Controller
            control={control}
            name="language"
            rules={{ required: '语言不能为空' }}
            defaultValue="zh-cn"
            render={({ field, fieldState: { error } }) => (
              <Form.Item
                label="默认语言"
                validateStatus={error ? 'error' : undefined}
                help={error?.message}
                style={{ marginBottom: 16 }}
              >
                <LocaleSelect {...field} className="w-full" />
              </Form.Item>
            )}
          />

          <TranslationForm control={control} ref={translationFormRef} />
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
};

export interface EditArticleFormProps {
  initData?: UpdateArticleData;
  submitting?: boolean;
  onSubmit: (data: UpdateArticleData) => void;
  onCancel?: () => void;
}

export const EditArticleForm: FC<EditArticleFormProps> = ({
  initData,
  submitting,
  onSubmit,
  onCancel,
  children,
}) => {
  const { control, handleSubmit } = useForm<UpdateArticleData>({
    defaultValues: initData,
  });

  const $antForm = useRef<FormInstance>(null!);

  return (
    <div className="flex flex-col h-full">
      <div className="grow overflow-y-auto">
        <Form ref={$antForm} layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <ArticleForm control={control} />
        </Form>

        {children}
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
};
