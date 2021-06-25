import { Link, Route, Switch, useRouteMatch } from 'react-router-dom';
import { useQuery } from 'react-query';
import classNames from 'classnames';

import { QueryWrapper } from 'components/QueryWrapper';
import { Page } from 'components/Page';
import { Ticket, TicketStatus } from './Ticket';
import { NewTicket } from './New';

function fetchTickets(): Promise<Ticket[]> {
  const tickets: Ticket[] = [
    {
      id: 'ticket-1',
      title: '我是标题我是标题我是标题我',
      content: '',
      status: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'ticket-2',
      title: '我是标题我是标题我是标题我是标题我是标题我是标题我是标题我是标题我是标题我是标题.',
      content: '',
      status: 160,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'ticket-3',
      title: '我是标题我是标题我是标题我',
      content: '',
      status: 120,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'ticket-4',
      title: '我是标题我是标题我是标题我',
      content: '',
      status: 250,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'ticket-5',
      title: '我是标题我是标题我是标题我',
      content: '',
      status: 250,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  return new Promise((resolve) => {
    setTimeout(() => resolve(tickets), 500);
  });
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
        <span className="ml-2 text-gray-400">更新时间: {ticket.updated_at}</span>
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
          return (
            <div className="">
              {tickets.map((ticket) => (
                <Link key={ticket.id} to={`/tickets/${ticket.id}`}>
                  <TicketItem ticket={ticket} />
                </Link>
              ))}
            </div>
          );
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
