import { useMemo } from 'react';

import { Article } from '@/api/article';
import { Tag } from '@/components/antd';

export interface ArticleStatusProps {
  article: Article;
}

export const ArticleStatus = ({ article }: ArticleStatusProps) => {
  const published = useMemo(() => {
    const now = new Date();
    if (article.publishedFrom && new Date(article.publishedFrom) > now) {
      return false;
    }
    if (article.publishedTo && new Date(article.publishedTo) < now) {
      return false;
    }
    return true;
  }, [article]);

  return (
    <>
      <Tag color={published ? 'green' : undefined} className="scale-110">
        {published ? '已发布' : '未发布'}
      </Tag>
    </>
  );
};
