import classNames from 'classnames';

import { TicketSchema } from '@/api/ticket';
import { useHoverMenu } from './HoverMenu';
import { TicketOverview } from './TicketOverview';

interface TicketLinkProps {
  ticket: TicketSchema;
  className?: string;
  showId?: boolean;
  viewId?: string;
}

export function TicketLink({ ticket, className, showId = true, viewId }: TicketLinkProps) {
  const { hover, menu } = useHoverMenu<string>({
    render: (ticketId) => <TicketOverview ticketId={ticketId} />,
  });

  return (
    <a
      className={classNames(className, 'mt-1.5 font-bold')}
      href={`/tickets/${ticket.nid}${viewId ? `?view=${viewId}` : ''}`}
      target="_blank"
      {...hover(ticket.id)}
    >
      <span>{ticket.title}</span>
      {showId && <span className="ml-1 text-[#6f7c87]">#{ticket.nid}</span>}
      {menu}
    </a>
  );
}
