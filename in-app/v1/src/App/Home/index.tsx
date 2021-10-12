import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { http } from 'leancloud';
import { PageContent, PageHeader } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { ArticleLink, CategoryList, useCategories, useFAQs } from '../Categories';
import { useRootCategory } from '../../App';
import { useQuery } from 'react-query';

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
async function fetchUnread() {
  const { data } = await http.get<boolean>('/api/2/unread');
  return data;
}

function useHasUnreadTickets() {
  return useQuery({
    queryKey: 'unread',
    queryFn: fetchUnread,
  });
}

export default function Home() {
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
  const { data: hasUnreadTickets } = useHasUnreadTickets();

  const { data: FAQs } = useFAQs(rootCategory);

  return (
    <>
      <PageHeader />
      <PageContent>
        {FAQs && FAQs.length > 0 && (
          <div className="px-2">
            {FAQs.map((FAQ) => (
              <ArticleLink
                article={FAQ}
                key={FAQ.id}
                className="block mt-2 px-3 py-2.5 rounded-sm bg-yellow-100"
              />
            ))}
          </div>
        )}
        <div className="flex items-center h-[46px] px-5">
          <h2 className="flex-grow font-bold">{t('category.select_hint')}</h2>
          <TicketsLink badge={hasUnreadTickets} />
        </div>
        <QueryWrapper result={result}>
          <CategoryList marker categories={topCategories} />
        </QueryWrapper>
      </PageContent>
    </>
  );
}
