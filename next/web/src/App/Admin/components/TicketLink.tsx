import { TicketSchema } from '@/api/ticket';
import classNames from 'classnames';

export function TicketLink({
  ticket,
  className,
  showId = true,
}: {
  ticket: TicketSchema;
  className?: string;
  showId?: boolean;
}) {
  return (
    <a
      className={classNames(className, 'mt-1.5 font-bold')}
      title={ticket.title}
      href={`/tickets/${ticket.nid}`}
      target="_blank"
    >
      <span>{ticket.title}</span>
      {showId && <span className="ml-1 text-[#6f7c87]">#{ticket.nid}</span>}
    </a>
  );
}
