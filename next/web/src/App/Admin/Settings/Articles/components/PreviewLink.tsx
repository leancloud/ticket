import { useMemo } from 'react';
import { useMutation } from 'react-query';
import { Button, Tooltip } from 'antd';

import { fetchArticleTranslation } from '@/api/article';
import { useCategories } from '@/api/category';

export interface PreviewLinkProps {
  articleId: string;
  language: string;
}

export const PreviewLink = ({ articleId, language }: PreviewLinkProps) => {
  const { data: categories, isLoading } = useCategories({ active: true });

  const productId = useMemo(() => categories?.[0]?.id, [categories]);

  const { mutate: preview, isLoading: loadingTranslation } = useMutation({
    mutationFn: () => fetchArticleTranslation(articleId, language),
    onSuccess: (article) => {
      const articleData = JSON.stringify({
        title: article.title,
        contentSafeHTML: article.contentSafeHTML,
        updatedAt: article.updatedAt,
      });
      localStorage.setItem('TapDesk/articlePreview', articleData);
      window.open(
        `/in-app/v1/products/${productId}/articles/preview?nav=0`,
        'self',
        'width=500,height=600'
      );
    },
  });

  return (
    <Tooltip
      title="你需要一个启用中的产品来使用预览"
      open={isLoading ? false : productId ? false : undefined}
    >
      <Button
        type="link"
        disabled={!productId}
        onClick={() => preview()}
        loading={loadingTranslation}
        style={{ padding: 0, border: 0, height: 'fit-content' }}
      >
        文章预览
      </Button>
    </Tooltip>
  );
};
