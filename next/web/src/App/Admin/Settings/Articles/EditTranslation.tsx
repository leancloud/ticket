import { FC } from 'react';
import { useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { pick } from 'lodash-es';

import { useArticleTranslation, useUpdateArticleTranslation } from '@/api/article';
import { Spin, message } from '@/components/antd';
import { EditArticleTranslationForm } from './EditArticleTranslationForm';

export const EditArticleTranslation: FC = () => {
  const { id, language } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: translation, isLoading } = useArticleTranslation(id!, language!, {
    staleTime: 1000 * 60,
  });

  const { mutate: update, isLoading: isUpdating } = useUpdateArticleTranslation({
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries('ArticleTranslations');
      queryClient.invalidateQueries(['ArticleTranslation', id]);
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`更新失败：${error.message}`);
    },
  });

  if (isLoading) {
    return <div className="h-80 my-40 text-center" children={<Spin />} />;
  }

  return (
    <EditArticleTranslationForm
      initData={pick(translation, ['title', 'content'])}
      onSubmit={(data) => update({ id: id!, language: language!, ...data })}
      onCancel={() => navigate('../..')}
      submitting={isLoading || isUpdating}
    />
  );
};
