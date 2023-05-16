import { http } from '@/leancloud';
import { useAuth } from '@/states/auth';
import { Ticket } from '@/types';
import { UseQueryOptions, useQuery } from 'react-query';

async function fetchTicket(id: string): Promise<Ticket> {
  const { data } = await http.get('/api/2/tickets/' + id);
  return data;
}

export function useTicket(id: string, options?: UseQueryOptions<Ticket>) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id),
    ...options,
  });
}
async function fetchUnread(categoryId?: string) {
  const { data } = await http.get<boolean>(`/api/2/unread`, {
    params: {
      product: categoryId,
    },
  });
  return data;
}

export function useHasUnreadTickets(categoryId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['unread', categoryId],
    queryFn: () => fetchUnread(categoryId),
    enabled: user !== undefined,
  });
}
