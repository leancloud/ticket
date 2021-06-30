import { Link, Route, Switch, useRouteMatch } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from 'react-query';

import { QueryWrapper } from 'components/QueryWrapper';
import { Page } from 'components/Page';
import { Time } from 'components/Time';
import { RawTicket, Ticket, TicketStatus } from './Ticket';
import { NewTicket } from './New';
import { auth, http } from 'leancloud';
import { useMemo } from 'react';

const TICKETS_PAGE_SIZE = 10;

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
    id: ticket.id,
    nid: ticket.nid,
    title: ticket.title,
    content: ticket.content,
    status: ticket.status,
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
    <div className="p-4 border-b border-gray-100 active:bg-gray-50">
      <div className="text-xs">
        <TicketStatus status={ticket.status} />
        <span className="ml-2 text-gray-400">
          更新时间: <Time value={ticket.updatedAt} />
        </span>
      </div>
      <div className="mt-2 truncate">{ticket.title}</div>
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
        <Ticket />
      </Route>
    </Switch>
  );
}
