import { useMemo } from 'react';
import { Link, Route, Switch, useRouteMatch } from 'react-router-dom';
import { useInfiniteQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { InView } from 'react-intersection-observer';

import { QueryWrapper } from 'components/QueryWrapper';
import { Page } from 'components/Page';
import { Time } from 'components/Time';
import TicketDetail, { TicketStatus } from './Ticket';
import { NewTicket } from './New';
import { auth, http } from 'leancloud';
import { Ticket } from 'types';
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
      q: 'sort:created_at-desc',
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
          <TicketStatus status={ticket.status} />
          <span className="ml-3 text-[#BFBFBF]">
            {t('ticket.updated_at')}: <Time value={ticket.updatedAt} />
          </span>
        </div>
        <div className="mt-1.5 truncate text-[13px]">{ticket.title}</div>
      </div>
      {ticket.unreadCount > 0 && (
        <div className="flex-shrink-0 ml-2 w-[18px] h-[18px] leading-[18px] px-1 min-w-min bg-red-500 rounded-full text-white text-xs text-center">
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
  const tickets = useMemo(() => data?.pages.flat() ?? [], [data]);

  return (
    <Page title={t('ticket.record')}>
      <QueryWrapper result={result} noData={noData} noDataMessage={t('ticket.no_record')}>
        <>
          {tickets.map((ticket) => (
            <Link key={ticket.id} className="px-4 active:bg-gray-50" to={`/tickets/${ticket.id}`}>
              <TicketItem ticket={ticket} />
            </Link>
          ))}
          {!noData && (
            <InView
              className="text-center w-full py-3 text-xs text-gray-300"
              onChange={(inView) => inView && fetchNextPage()}
            >
              {hasNextPage ? t('general.loading') + '...' : t('ticket.no_more_record')}
            </InView>
          )}
        </>
      </QueryWrapper>
    </Page>
  );
}

export default function Tickets() {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route path={path} exact>
        <TicketList />
      </Route>
      <Route path={`${path}/new`}>
        <NewTicket />
      </Route>
      <Route path={`${path}/:id`}>
        <TicketDetail />
      </Route>
    </Switch>
  );
}
