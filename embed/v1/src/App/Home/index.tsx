import { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';

import { Page } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { Category, CategoryList, useCategories } from '../Categories';
import { db } from 'leancloud';

interface TicketsLinkProps {
  badge?: boolean;
}

function TicketsLink({ badge }: TicketsLinkProps) {
  return (
    <Link className="inline-block p-1.5 text-xs leading-none text-tapBlue-600" to="/tickets">
      问题记录
      {badge && <div className="h-1.5 w-1.5 bg-red-500 rounded-full absolute top-0 right-0" />}
    </Link>
  );
}

function useHasUnreadTickets() {
  const [hasUnreadTickets, setHasUnreadTickets] = useState(false);
  useEffect(() => {
    db.class('Ticket')
      .select('objectId')
      .where('unreadCount', '>', 0)
      .first()
      .then((ticket) => ticket && setHasUnreadTickets(true));
  }, []);
  return hasUnreadTickets;
}

export default function Home() {
  const history = useHistory();
  const result = useCategories();
  const categories = result.data;
  const topCategories = useMemo(() => {
    if (!categories) {
      return [];
    }
    return categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position);
  }, [categories]);
  const hasUnreadTickets = useHasUnreadTickets();

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

  return (
    <Page className="flex flex-col p-4">
      <div className="flex justify-between items-center relative">
        <h2 className="font-bold">请选择你遇到的问题</h2>
        <TicketsLink badge={hasUnreadTickets} />
      </div>
      <QueryWrapper result={result}>
        <CategoryList marker className="mt-2" categories={topCategories} onClick={handleClick} />
      </QueryWrapper>
    </Page>
  );
}
