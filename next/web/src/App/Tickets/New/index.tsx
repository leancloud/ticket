import { TicketForm } from './TicketForm';

export function NewTicket() {
  return <TicketForm onSubmit={(data) => console.log(data)} />;
}
