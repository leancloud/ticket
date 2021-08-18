import { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { auth, db } from 'leancloud';
import { Category } from 'types';
import { PageContent, PageHeader } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { useIsMounted } from 'utils/useIsMounted';
import { CategoryList, useCategories } from '../Categories';
import { useRootCategory } from '../../App';

interface TicketsLinkProps {
  badge?: boolean;
}

function TicketsLink({ badge }: TicketsLinkProps) {
  const { t } = useTranslation();
  return (
    <Link className="relative p-1.5 text-sm leading-none text-tapBlue" to="/tickets">
      {t('ticket.record')}
      {badge && <div className="h-1.5 w-1.5 bg-red-500 rounded-full absolute top-0 right-0" />}
    </Link>
  );
}

function useHasUnreadTickets() {
  const [hasUnreadTickets, setHasUnreadTickets] = useState(false);
  const isMounted = useIsMounted();
  const rootCategory = useRootCategory();
  useEffect(() => {
    db.class('Ticket')
      .select('objectId')
      .where('unreadCount', '>', 0)
      .where('author', '==', auth.currentUser)
      .first()
      .then((ticket) => ticket && isMounted() && setHasUnreadTickets(true))
      .catch(console.error);
  }, [rootCategory]);
  return hasUnreadTickets;
}

export default function Home() {
  const history = useHistory();
  const { t } = useTranslation();
  const result = useCategories();
  const categories = result.data;
  const rootCategory = useRootCategory();
  const topCategories = useMemo(() => {
    if (!categories) {
      return [];
    }
    return categories
      .filter((c) => (rootCategory ? c.parentId === rootCategory : !c.parentId))
      .sort((a, b) => a.position - b.position);
  }, [categories]);
  const hasUnreadTickets = useHasUnreadTickets();

  const handleClick = ({ id }: Category) => {
    if (!categories) {
      return;
    }
    const hasChildren = categories.findIndex((c) => c.parentId === id) !== -1;
    if (hasChildren) {
      history.push(`/categories/${id}`);
    } else {
      history.push(`/tickets/new?category_id=${id}`);
    }
  };

  return (
    <>
      <PageHeader />
      <PageContent>
        <div className="flex items-center h-[46px] px-5">
          <h2 className="flex-grow font-bold">{t('category.select_hint')}</h2>
          <TicketsLink badge={hasUnreadTickets} />
        </div>
        <QueryWrapper result={result}>
          <CategoryList marker categories={topCategories} onClick={handleClick} />
        </QueryWrapper>
      </PageContent>
    </>
  );
}
