import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from 'react-query';

import { http } from '@/leancloud';

export interface V1_Ticket {
  private?: boolean;
  subscribed: boolean;
  tags: { key: string; value: string }[];
  private_tags: { key: string; value: string }[];
}

export function useTicket_v1(ticketId: string, options?: UseQueryOptions<V1_Ticket, Error>) {
  return useQuery({
    queryKey: ['v1_ticket', ticketId],
    queryFn: async () => {
      const res = await http.get<V1_Ticket>(`/api/1/tickets/${ticketId}`);
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
