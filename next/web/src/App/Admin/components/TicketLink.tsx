import { Link } from 'react-router-dom';
import classNames from 'classnames';

import { useHoverMenu } from './HoverMenu';
import { TicketOverview } from './TicketOverview';

interface TicketLinkProps {
  ticket: {
    id: string;
    nid: number;
    title: string;
  };
  className?: string;
  viewId?: string;
}

export function TicketLink({ ticket, className, viewId }: TicketLinkProps) {
  const { hover, menu } = useHoverMenu<string>({
    render: (ticketId) => <TicketOverview ticketId={ticketId} />,
  });

  return (
    <Link
      className={classNames('flex font-bold', className)}
      to={`/admin/tickets/${ticket.nid}${viewId ? `?view=${viewId}` : ''}`}
      target="_blank"
      {...hover(ticket.id)}
    >
      <span className="!text-[#6f7c87]">#{ticket.nid}</span>
      <span className="ml-1 truncate">{ticket.title}</span>
      {menu}
    </Link>
  );
}
