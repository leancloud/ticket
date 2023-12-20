import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import classNames from 'classnames';

export type ItemProps = { title: string; href?: string };

interface Props {
  items?: ItemProps[];
  showHome?: boolean;
  className?: string;
}

function Item({ title, href, last }: ItemProps & { last: boolean }) {
  const className = last ? `` : `text-gray-400`;
  const content = href ? (
    <Link className={classnames(className, `hover:underline`)} to={href}>
      {title}
    </Link>
  ) : (
    <span className={className}>{title}</span>
  );

  return (
    <>
      {content} {!last && '  /  '}
    </>
  );
}

export function Breadcrumb({ showHome = true, items, className }: Props) {
  const list = useMemo(() => {
    const res: ItemProps[] = [];
    if (showHome) {
      res.unshift({ title: 'Home', href: '/' });
    }
    if (items) {
      res.push(...items);
    }
    return res;
  }, []);

  if (!list.length) {
    return null;
  }

  return (
    <div className={classNames('px-4 px-4 text-[16px]', className)}>
      {list.map((item, i) => (
        <Item key={i} {...item} last={i === list.length - 1} />
      ))}
    </div>
  );
}
