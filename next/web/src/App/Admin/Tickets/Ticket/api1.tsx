import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from 'react-query';
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

export function useUpdateTicket_v1(
  ticketId: string,
  options?: UseMutationOptions<{}, Error, Partial<V1_Ticket>>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => {
      return http.patch(`/api/1/tickets/${ticketId}`, data);
    },
    onSuccess: (_, vars) => {
      queryClient.setQueryData<V1_Ticket | undefined>(['v1_ticket', ticketId], (prev) => {
        if (prev) {
          return { ...prev, ...vars };
        }
      });
    },
    ...options,
  });
}
