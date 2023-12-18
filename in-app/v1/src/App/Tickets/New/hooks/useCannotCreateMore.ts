import { TicketResolvedStatus } from '../../Ticket';
import { useTickets } from '../../hooks/useTickets';

const MAX_OPEN_COUNT = import.meta.env.VITE_MAX_OPEN_COUNT;

export function useCannotCreateMore() {
  const { data } = useTickets({
    status: TicketResolvedStatus.unResolved,
    queryOptions: {
      enabled: !!MAX_OPEN_COUNT,
      suspense: true,
    },
  });

  const count = data?.pages[0]?.length ?? 0;

  return MAX_OPEN_COUNT ? count >= parseInt(MAX_OPEN_COUNT) : false;
}
