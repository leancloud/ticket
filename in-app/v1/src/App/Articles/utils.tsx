import { Link } from 'react-router-dom';
import classNames from 'classnames';

import { Article } from '@/types';
import { ListItem } from '../Categories';

export const NoticeLink = ({
  article,
  className,
  children = article.title,
}: {
  article: Article;
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <Link to={`/articles/${article.slug}?from-notice=true`} className={className}>
      {children}
    </Link>
  );
};

export const ArticleListItem = ({
  article,
  className,
  fromCategory,
  children = article.title,
}: {
  article: Article;
  className?: string;
  fromCategory?: string;
  children?: React.ReactNode;
}) => {
  return (
    <ListItem
      key={article.id}
      to={`/articles/${article.id}${fromCategory ? `?from-category=${fromCategory}` : ''}`}
      content={children}
      className={classNames('text-[13px] !h-[38px]', className)}
    />
  );
};
