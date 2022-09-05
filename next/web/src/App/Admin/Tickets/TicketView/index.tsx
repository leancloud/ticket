import { TicketSchema } from '@/api/ticket';
import { TicketList } from './TicketList';
import { TicketTable } from './TicketTable';

export interface TicketViewProps {
  layout: 'card' | 'table';
  loading?: boolean;
  tickets?: TicketSchema[];
  checkedIds: string[];
  onChangeChecked: (id: string, checked: boolean) => void;
}

export function TicketView({ layout, ...props }: TicketViewProps) {
  return (
    <>
      {layout === 'card' && <TicketList {...props} />}
      {layout === 'table' && <TicketTable {...props} />}
    </>
  );
}
