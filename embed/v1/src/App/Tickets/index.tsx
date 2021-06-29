import { Link, Route, Switch, useRouteMatch } from 'react-router-dom';
import { useQuery } from 'react-query';

import { QueryWrapper } from 'components/QueryWrapper';
import { Page } from 'components/Page';
import { Time } from 'components/Time';
import { RawTicket, Ticket, TicketStatus } from './Ticket';
import { NewTicket } from './New';
import { auth, http } from 'leancloud';

async function fetchTickets(): Promise<Ticket[]> {
  const { data } = await http.get<RawTicket[]>('/api/1/tickets', {
    params: {
      author_id: auth.currentUser?.id,
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
  return useQuery({
    queryKey: 'tickets',
    queryFn: fetchTickets,
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

  return (
    <Page title="问题记录">
      <QueryWrapper noData={!result.data?.length} noDataMessage="暂无问题记录" result={result}>
        {(tickets) => {
          return tickets.map((ticket) => (
            <Link key={ticket.id} to={`/tickets/${ticket.id}`}>
              <TicketItem ticket={ticket} />
            </Link>
          ));
        }}
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
