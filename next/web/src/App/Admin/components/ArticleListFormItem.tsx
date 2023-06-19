import { Link } from 'react-router-dom';

import { Article } from '@/api/article';
import { Button, Empty } from '@/components/antd';
import { SortableListFormItem } from './SortableListFormItem';
import { checkArticlePublished } from '@/App/Admin/Settings/Articles/utils';

interface ArticleListFormItemProps {
  articles?: Article[];
  value?: string[];
  onChange: (ids: string[]) => void;
  maxCount?: number;
  modalTitle?: string;
  readonly?: boolean;
  loading?: boolean;
}

export function ArticleListFormItem({
  articles,
  value,
  onChange,
  maxCount,
  modalTitle,
  readonly,
  loading,
}: ArticleListFormItemProps) {
  return (
    <SortableListFormItem
      items={articles}
      itemKey={(article) => article.id}
      value={value}
      onChange={onChange}
      readonly={readonly}
      loading={loading}
      renderListItem={(article) => (
        <a
          className="truncate"
          href={`/next/admin/settings/articles/${article.id}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          {checkArticlePublished(article) ? article.name : `${article.name} (未发布)`}
        </a>
      )}
      renderTransferItem={(article) => article.name}
      maxCount={maxCount}
      modalTitle={modalTitle || '编辑'}
      emptyElement={
        <Empty description="暂无文章">
          <Link to="/next/admin/settings/articles/new">
            <Button type="primary">创建</Button>
          </Link>
        </Empty>
      }
    />
  );
}
