import { Article, useUpdateArticle } from '@/api/article';
import { Button, ButtonProps, message } from '@/components/antd';
import { FC } from 'react';
import { useQueryClient } from 'react-query';

export interface ToggleArticlePrivateButtonProps extends ButtonProps {
  article: Article;
}

export const ToggleArticlePrivateButton: FC<ToggleArticlePrivateButtonProps> = ({
  article,
  ...props
}) => {
  const queryClient = useQueryClient();

  const { mutate, isLoading } = useUpdateArticle({
    onSuccess: () => {
      queryClient.invalidateQueries('articles');
      queryClient.invalidateQueries(['article', article.id]);
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`更新失败：${error.message}`);
    },
  });
  return (
    <Button
      {...props}
      disabled={isLoading}
      size="small"
      onClick={() => mutate({ private: !article.private, id: article.id })}
    >
      {article.private ? '发布' : '撤销发布'}
    </Button>
  );
};
