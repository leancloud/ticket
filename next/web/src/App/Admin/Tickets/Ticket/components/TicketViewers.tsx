import { Avatar, Tooltip } from 'antd';

import { UseTicketViewersOptions, useTicketViewers } from '../hooks/useTicketViewers';

interface TicketViewersProps {
  ticket: UseTicketViewersOptions;
}

export function TicketViewers({ ticket }: TicketViewersProps) {
  const viewers = useTicketViewers(ticket);
  const maxCount = 4;
  return (
    <div className="flex items-center pr-2">
      <Avatar.Group maxCount={maxCount} maxStyle={{ margin: '0 -8px 0 0' }}>
        {viewers?.map((viewer, index) => (
          <Tooltip key={viewer.id} title={viewer.nickname}>
            <Avatar
              style={{
                backgroundColor: '#' + viewer.id.slice(-12, -6),
                margin: index >= maxCount ? undefined : '0 -8px 0 0',
              }}
            >
              {viewer.nickname.slice(0, 1)}
            </Avatar>
          </Tooltip>
        ))}
      </Avatar.Group>
    </div>
  );
}
