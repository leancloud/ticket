import { Link } from 'react-router-dom';
import classNames from 'classnames';

import { TicketSchema } from '@/api/ticket';
import { useHoverMenu } from './HoverMenu';
import { TicketOverview } from './TicketOverview';

interface TicketLinkProps {
  ticket: TicketSchema;
  className?: string;
  viewId?: string;
}

export function TicketLink({ ticket, className, viewId }: TicketLinkProps) {
  const { hover, menu } = useHoverMenu<string>({
    render: (ticketId) => <TicketOverview ticketId={ticketId} />,
  });

  return (
    <div className={classNames('flex font-bold', className)} {...hover(ticket.id)}>
      <Link
        className="!text-[#6f7c87]"
        to={`${ticket.nid}${viewId ? `?view=${viewId}` : ''}`}
        target="_blank"
      >
        #{ticket.nid}
      </Link>
      <a
        className="ml-1 truncate"
        href={`/tickets/${ticket.nid}${viewId ? `?view=${viewId}` : ''}`}
        target="_blank"
      >
        {ticket.title}
      </a>
      {menu}
    </div>
  );
}
