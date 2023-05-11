import { Link, LinkProps } from 'react-router-dom';
import classNames from 'classnames';

import { Article } from '@/types';
import { ListItem } from '../Categories';

interface NoticeLinkProps extends Omit<LinkProps, 'to'> {
  article: Article;
}

export const NoticeLink = ({ article, children, ...props }: NoticeLinkProps) => {
  return (
    <Link {...props} to={`/articles/${article.slug}?from-notice=true`}>
      {children ?? article.title}
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
