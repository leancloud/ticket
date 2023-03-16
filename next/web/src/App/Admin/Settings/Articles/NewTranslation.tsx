import { useCreateArticleTranslation } from '@/api/article';
import { message } from '@/components/antd';
import { FC } from 'react';
import { useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { EditArticleTranslationForm } from './EditArticleTranslationForm';

export const NewArticleTranslation: FC = () => {
  const { id, language } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate: create, isLoading } = useCreateArticleTranslation({
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries('ArticleTranslations');
      navigate('../..');
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`创建失败：${error.message}`);
    },
  });

  return (
    <EditArticleTranslationForm
      onSubmit={(data) => create({ id: id!, language: language!, ...data })}
      submitting={isLoading}
      onCancel={() => navigate('../..')}
      acceptComment={false}
    />
  );
};
