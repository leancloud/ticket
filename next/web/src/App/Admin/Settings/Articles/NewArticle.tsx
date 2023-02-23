import { useCreateArticle } from '@/api/article';
import { FC } from 'react';
import { NewArticleForm } from './EditArticleForm';
import { useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { message } from '@/components/antd';

export const NewArticle: FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate: create, isLoading } = useCreateArticle({
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries('articles');
      navigate('..');
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`创建失败：${error.message}`);
    },
  });

  return (
    <NewArticleForm onSubmit={create} submitting={isLoading} onCancel={() => navigate('..')} />
  );
};
