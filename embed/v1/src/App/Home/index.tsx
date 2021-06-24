import { useMemo } from 'react';
import { Link, useHistory } from 'react-router-dom';

import { Page } from 'components/Page';
import { Loading } from 'components/Loading';
import { Category, CategoryList, useCategories } from '../Categories';

interface TicketsLinkProps {
  badge?: boolean;
}

function TicketsLink({ badge }: TicketsLinkProps) {
  return (
    <Link className="inline-block p-1.5 text-sm text-primary" to="/login">
      问题记录
      {badge && <div className="h-1.5 w-1.5 bg-red-500 rounded-full absolute top-1 right-0" />}
    </Link>
  );
}

export default function Home() {
  const history = useHistory();
  const { categories, error } = useCategories();
  const topCategories = useMemo(() => {
    if (!categories) {
      return [];
    }
    return categories.filter((c) => !c.parent_id);
  }, [categories]);

  const handleClick = ({ id }: Category) => {
    if (!categories) {
      return;
    }
    const hasChildren = categories.findIndex((c) => c.parent_id === id) !== -1;
    if (hasChildren) {
      history.push(`/categories/${id}`);
    } else {
      history.push(`/tickets/new?category_id=${id}`);
    }
  };

  if (error) {
    throw error;
  }
  return (
    <Page>
      <div className="flex flex-col p-4 max-h-full">
        <div className="flex justify-between items-center relative">
          <h2 className="font-bold">请选择你遇到的问题</h2>
          <TicketsLink badge />
        </div>
        {categories ? (
          <CategoryList className="mt-2" categories={topCategories} onClick={handleClick} />
        ) : (
          <Loading />
        )}
      </div>
    </Page>
  );
}
