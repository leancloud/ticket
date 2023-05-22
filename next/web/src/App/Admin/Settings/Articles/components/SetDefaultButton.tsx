import { useQueryClient } from 'react-query';

import { useUpdateArticle } from '@/api/article';
import { Button, ButtonProps, message } from '@/components/antd';

export interface SetDefaultButtonProps extends ButtonProps {
  articleId: string;
  defaultLanguage?: string;
  language: string;
}

export function SetDefaultButton({
  articleId,
  language,
  defaultLanguage,
  ...props
}: SetDefaultButtonProps) {
  const queryClient = useQueryClient();

  const { mutate: update, isLoading } = useUpdateArticle({
    onSuccess: () => {
      queryClient.invalidateQueries('articles');
      queryClient.invalidateQueries(['article', articleId]);
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`更新失败：${error.message}`);
    },
  });

  return (
    <Button
      onClick={() => {
        update({ id: articleId, defaultLanguage: language });
      }}
      loading={isLoading}
      disabled={defaultLanguage === language}
      size="small"
      {...props}
    >
      {defaultLanguage === language ? '已是默认' : '设为默认'}
    </Button>
  );
}
