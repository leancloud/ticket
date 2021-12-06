import { useState } from 'react';

import { TicketSchema } from '@/api/ticket';
import { TicketList } from './TicketList';

export interface TicketViewProps {
  tickets: TicketSchema[];
  checkedIds: string[];
  onChangeChecked: (id: string, checked: boolean) => void;
}

export function TicketView({ tickets, checkedIds, onChangeChecked }: TicketViewProps) {
  const [layout, setLayout] = useState<'list' | 'table'>('list');

  return (
    <>
      {layout === 'list' && (
        <TicketList tickets={tickets} checkedIds={checkedIds} onChangeChecked={onChangeChecked} />
      )}
      {layout === 'table' && <div>table</div>}
    </>
  );
}
