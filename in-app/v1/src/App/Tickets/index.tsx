import { useMemo } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useInfiniteQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { InView } from 'react-intersection-observer';
import { flatten } from 'lodash-es';

import { auth, http } from '@/leancloud';
import { Ticket } from '@/types';
import { QueryWrapper } from '@/components/QueryWrapper';
import { PageContent, PageHeader } from '@/components/Page';
import { Time } from '@/components/Time';
import { LoadingHint } from '@/components/Loading';
import TicketDetail, { TicketStatus } from './Ticket';
import { NewTicket } from './New';
import { useRootCategory } from '../../App';

const TICKETS_PAGE_SIZE = 20;

async function fetchTickets({
  categoryId,
  page,
}: {
  categoryId?: string;
  page?: number;
}): Promise<Ticket[]> {
  const { data } = await http.get<any[]>('/api/1/tickets', {
    params: {
      author_id: auth.currentUser?.id,
      // TODO: waiting for support in v2 API
      root_category_id: categoryId,
      page,
      page_size: TICKETS_PAGE_SIZE,
      q: 'sort:updated_at-desc',
    },
  });
  return data.map((ticket) => ({
    id: ticket.id,
    nid: ticket.nid,
    title: ticket.title,
    content: ticket.content,
    status: ticket.status,
    unreadCount: ticket.unread_count,
    files: ticket.files,
    evaluation: ticket.evaluation,
    createdAt: new Date(ticket.created_at),
    updatedAt: new Date(ticket.updated_at),
  }));
}

export function useTickets() {
  const categoryId = useRootCategory();
  return useInfiniteQuery<Ticket[], Error>({
    queryKey: 'tickets',
    queryFn: ({ pageParam = 1 }) => fetchTickets({ categoryId, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === TICKETS_PAGE_SIZE) {
        return allPages.length + 1;
      }
    },
  });
}

interface TicketItemProps {
  ticket: Ticket;
}

function TicketItem({ ticket }: TicketItemProps) {
  const { t } = useTranslation();

  return (
    <div className="h-[68px] flex justify-between items-center border-b border-gray-100">
      <div className="overflow-hidden">
        <div className="text-sm">
          <TicketStatus className="mr-3" status={ticket.status} />
          <span className="text-[#BFBFBF] whitespace-nowrap">
            {t('ticket.updated_at')}: <Time value={ticket.updatedAt} />
          </span>
        </div>
        <div className="mt-1.5 truncate text-[13px]">{ticket.title}</div>
      </div>
      {ticket.unreadCount > 0 && (
        <div className="shrink-0 ml-2 w-[18px] leading-[18px] px-1 min-w-min bg-red rounded-full text-white text-xs text-center">
          {ticket.unreadCount}
        </div>
      )}
    </div>
  );
}

export function TicketList() {
  const { t } = useTranslation();
  const result = useTickets();
  const { data, hasNextPage, fetchNextPage } = result;
  const noData = useMemo(() => !data?.pages[0]?.length, [data]);
  const tickets = useMemo(() => flatten(data?.pages), [data]);

  return (
    <>
      <PageHeader>{t('ticket.record')}</PageHeader>
      <PageContent>
        <QueryWrapper result={result} noData={noData} noDataMessage={t('ticket.no_record')}>
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              className="block px-4 active:bg-gray-50"
              to={`/tickets/${ticket.id}`}
            >
              <TicketItem ticket={ticket} />
            </Link>
          ))}
          <InView
            className="flex justify-center items-center w-full h-12 text-[#BFBFBF] text-[13px]"
            onChange={(inView) => inView && fetchNextPage()}
          >
            {hasNextPage ? <LoadingHint /> : t('ticket.no_more_record')}
          </InView>
        </QueryWrapper>
      </PageContent>
    </>
  );
}

export default function Tickets() {
  return (
    <Routes>
      <Route index element={<TicketList />} />
      <Route path="new" element={<NewTicket />} />
      <Route path=":id" element={<TicketDetail />} />
    </Routes>
  );
}
