import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { ChevronRightIcon } from '@heroicons/react/solid';

import { http } from '@/leancloud';
import { PageContent, PageHeader } from '@/components/Page';
import { QueryWrapper } from '@/components/QueryWrapper';
import SpeakerIcon from '@/icons/Speaker';
import { useRootCategory } from '@/App';
import { CategoryList, useCategories } from '@/App/Categories';
import { useNotices, ArticleLink } from '@/App/Articles/utils';
import { keyBy } from 'lodash-es';
import Topics from './Topics';

interface TicketsLinkProps {
  badge?: boolean;
}

function TicketsLink({ badge }: TicketsLinkProps) {
  const { t } = useTranslation();
  return (
    <Link className="relative p-3 -mr-3 text-[13px] leading-none text-tapBlue" to="/tickets">
      {t('ticket.record')}
      {badge && <div className="h-1.5 w-1.5 bg-red rounded-full absolute top-0 right-0" />}
    </Link>
  );
}
async function fetchUnread(categoryId?: string) {
  const { data } = await http.get<boolean>(`/api/2/unread`, {
    params: {
      product: categoryId,
    },
  });
  return data;
}

function useHasUnreadTickets(categoryId?: string) {
  return useQuery({
    queryKey: ['unread', categoryId],
    queryFn: () => fetchUnread(categoryId),
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
    const map = keyBy(categories, 'id');
    return categories
      .filter((c) => c.parentId && !map[c.parentId])
      .sort((a, b) => a.position - b.position);
  }, [categories]);
  const { data: hasUnreadTickets } = useHasUnreadTickets(rootCategory);

  const { data: notices } = useNotices(rootCategory);

  return (
    <QueryWrapper result={result}>
      <PageHeader />
      <PageContent>
        {notices && notices.length > 0 && (
          <div className="px-3 mt-1 text-sm">
            {notices.map((notice) => (
              <ArticleLink
                article={notice}
                key={notice.id}
                className="my-1 px-2.5 py-2 rounded flex items-center bg-tapBlue bg-opacity-5 active:bg-tapBlue-50"
              >
                <SpeakerIcon className="text-tapBlue shrink-0" />
                <span className="grow truncate ml-2 mr-1">{notice.title}</span>
                <ChevronRightIcon className="shrink-0 h-4 w-4 text-tapBlue" />
              </ArticleLink>
            ))}
          </div>
        )}
        <div className="flex items-center h-[46px] px-4 mt-1">
          <h2 className="grow font-bold">{t('category.select_hint')}</h2>
          <TicketsLink badge={hasUnreadTickets} />
        </div>
        <CategoryList marker categories={topCategories} />

        <Topics />
      </PageContent>
    </QueryWrapper>
  );
}
