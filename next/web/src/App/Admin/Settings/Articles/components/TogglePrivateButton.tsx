import {
  Article,
  ArticleTranslationAbstract,
  useUpdateArticle,
  useUpdateArticleTranslation,
} from '@/api/article';
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

export interface ToggleTranslationPrivateButtonProps extends ButtonProps {
  translation: ArticleTranslationAbstract;
}

export const ToggleTranslationPrivateButton: FC<ToggleTranslationPrivateButtonProps> = ({
  translation,
  disabled,
  ...props
}) => {
  const queryClient = useQueryClient();

  const { mutate, isLoading } = useUpdateArticleTranslation({
    onSuccess: () => {
      queryClient.invalidateQueries('ArticleTranslations');
      queryClient.invalidateQueries(['ArticleTranslation', translation.id]);
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`更新失败：${error.message}`);
    },
  });
  return (
    <Button
      {...props}
      disabled={isLoading || disabled}
      size="small"
      onClick={() =>
        mutate({
          private: !translation.private,
          id: translation.id,
          language: translation.language,
        })
      }
    >
      {translation.private ? '发布' : '撤销发布'}
    </Button>
  );
};
