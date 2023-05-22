import { useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';

import { useCreateArticle } from '@/api/article';
import { message } from '@/components/antd';
import { NewArticleForm } from './EditArticleForm';

export function NewArticle() {
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
}
