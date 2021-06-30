import { Link, Route, Switch, useRouteMatch } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from 'react-query';

import { QueryWrapper } from 'components/QueryWrapper';
import { Page } from 'components/Page';
import { Time } from 'components/Time';
import TicketDetail, { TicketStatus } from './Ticket';
import { NewTicket } from './New';
import { auth, http } from 'leancloud';
import { useMemo } from 'react';

const TICKETS_PAGE_SIZE = 10;

interface RawTicket {
  id: string;
  nid: number;
  title: string;
  content: string;
  status: number;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

interface Ticket extends RawTicket {
  createdAt: Date;
  updatedAt: Date;
}

async function fetchTickets(page: number): Promise<Ticket[]> {
  const { data } = await http.get<RawTicket[]>('/api/1/tickets', {
    params: {
      author_id: auth.currentUser?.id,
      page,
      page_size: TICKETS_PAGE_SIZE,
      q: 'sort:created_at-desc',
    },
  });
  return data.map((ticket) => ({
    ...ticket,
    createdAt: new Date(ticket.created_at),
    updatedAt: new Date(ticket.updated_at),
  }));
}

export function useTickets() {
  return useInfiniteQuery<Ticket[], Error>({
    queryKey: 'tickets',
    queryFn: ({ pageParam = 1 }) => fetchTickets(pageParam),
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
  return (
    <div className="p-4 border-b border-gray-100 active:bg-gray-50 flex justify-between items-center">
      <div className="overflow-hidden">
        <div className="text-xs">
          <TicketStatus status={ticket.status} />
          <span className="ml-2 text-gray-400">
            更新时间: <Time value={ticket.updatedAt} />
          </span>
        </div>
        <div className="mt-2 truncate">{ticket.title}</div>
      </div>
      {ticket.unread_count > 0 && (
        <div className="flex-shrink-0 ml-2 w-5 h-5 min-w-min p-1 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
          {ticket.unread_count}
        </div>
      )}
    </div>
  );
}

export function TicketList() {
  const result = useTickets();
  const { data, hasNextPage, fetchNextPage } = result;
  const noData = useMemo<boolean | undefined>(() => {
    if (!data) {
      return undefined;
    }
    return !data.pages[0]?.length;
  }, [data]);

  return (
    <Page title="问题记录">
      <QueryWrapper result={result} noData={noData} noDataMessage="暂无问题记录">
        {(tickets) => (
          <>
            {tickets.pages.flat().map((ticket) => (
              <Link key={ticket.id} to={`/tickets/${ticket.id}`}>
                <TicketItem ticket={ticket} />
              </Link>
            ))}
            {!noData && hasNextPage && (
              <div className="text-center p-4" onClick={() => fetchNextPage()}>
                点击加载更多
              </div>
            )}
          </>
        )}
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
