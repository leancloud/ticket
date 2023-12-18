import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';
import { useAuth } from '@/states/auth';
import { Ticket, TicketListItem } from '@/types';

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

interface GetTicketsOptions {
  rootCategoryId?: string;
  authorId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  include?: string[];
  orderBy?: string;
}

export async function getTickets({
  rootCategoryId,
  authorId,
  status,
  page,
  pageSize,
  include,
  orderBy,
}: GetTicketsOptions = {}) {
  const res = await http.get<TicketListItem[]>('/api/2/tickets', {
    params: {
      rootCategoryId,
      authorId,
      status,
      page,
      pageSize,
      include: include?.join(','),
      orderBy,
    },
  });
  return res.data;
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
