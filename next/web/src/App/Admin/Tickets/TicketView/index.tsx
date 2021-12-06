import { TicketSchema } from '@/api/ticket';
import { TicketList } from './TicketList';
import { TicketTable } from './TicketTable';

export interface TicketViewProps {
  layout: 'card' | 'table';
  tickets: TicketSchema[];
  checkedIds: string[];
  onChangeChecked: (id: string, checked: boolean) => void;
}

export function TicketView({ layout, tickets, checkedIds, onChangeChecked }: TicketViewProps) {
  return (
    <>
      {layout === 'card' && (
        <TicketList tickets={tickets} checkedIds={checkedIds} onChangeChecked={onChangeChecked} />
      )}
      {layout === 'table' && (
        <TicketTable tickets={tickets} checkedIds={checkedIds} onChangeChecked={onChangeChecked} />
      )}
    </>
  );
}
