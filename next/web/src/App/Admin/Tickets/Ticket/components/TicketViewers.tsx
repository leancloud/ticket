import { Avatar, Tooltip } from 'antd';

import { UseTicketViewersOptions, useTicketViewers } from '../hooks/useTicketViewers';

interface TicketViewersProps {
  ticket: UseTicketViewersOptions;
}

export function TicketViewers({ ticket }: TicketViewersProps) {
  const viewers = useTicketViewers(ticket);
  return (
    <Avatar.Group maxCount={4} style={{ display: 'flex' }}>
      {viewers?.map((viewer) => (
        <Tooltip key={viewer.id} title={viewer.nickname}>
          <Avatar style={{ backgroundColor: '#' + viewer.id.slice(-12, -6) }}>
            {viewer.nickname.slice(0, 1)}
          </Avatar>
        </Tooltip>
      ))}
    </Avatar.Group>
  );
}
