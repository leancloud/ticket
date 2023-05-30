import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from 'react-query';

import { http } from '@/leancloud';

export interface Ticket_v1 {
  private?: boolean;
  subscribed: boolean;
  tags: TagData[];
  private_tags: TagData[];
}

interface TagData {
  key: string;
  value: string;
}

export function useTicket_v1(ticketId: string, options?: UseQueryOptions<Ticket_v1, Error>) {
  return useQuery({
    queryKey: ['ticket_v1', ticketId],
    queryFn: async () => {
      const res = await http.get<Ticket_v1>(`/api/1/tickets/${ticketId}`);
      return res.data;
    },
    ...options,
  });
}

export interface UpdateTicket_v1Data {
  private?: boolean;
  subscribed?: boolean;
}

export function useUpdateTicket_v1(
  options?: UseMutationOptions<{}, Error, [string, UpdateTicket_v1Data]>
) {
  return useMutation({
    mutationFn: async ([ticketId, data]) => {
      const res = await http.patch(`/api/1/tickets/${ticketId}`, data);
      return res.data;
    },
    ...options,
  });
}
