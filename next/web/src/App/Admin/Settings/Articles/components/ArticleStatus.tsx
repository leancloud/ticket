import { useMemo } from 'react';

import { Article } from '@/api/article';
import { Tag } from '@/components/antd';
import { checkArticlePublished } from '../utils';

export interface ArticleStatusProps {
  article: Article;
}

export const ArticleStatus = ({ article }: ArticleStatusProps) => {
  const published = useMemo(() => {
    return checkArticlePublished(article);
  }, [article]);

  return (
    <>
      <Tag color={published ? 'green' : undefined} className="scale-110">
        {published ? '已发布' : '未发布'}
      </Tag>
    </>
  );
};
