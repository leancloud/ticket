import { TicketSchema } from '@/api/ticket';

export function TicketLink({ ticket }: { ticket: TicketSchema }) {
  return (
    <a className="mt-1.5 font-bold max-w-full" title={ticket.title} href={`/tickets/${ticket.nid}`}>
      <span>{ticket.title}</span>
      <span className="ml-1 text-[#6f7c87]">#{ticket.nid}</span>
    </a>
  );
}
