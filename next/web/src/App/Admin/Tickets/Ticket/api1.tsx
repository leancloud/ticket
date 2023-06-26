import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from 'react-query';
import { compact, uniq } from 'lodash-es';

import { http } from '@/leancloud';

export interface Ticket_v1 {
  id: string;
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

export interface TicketField_v1 {
  id: string;
  type: string;
  variants: {
    title: string;
    options?: [string, string][];
  }[];
}

export function useTicketFields_v1(
  fieldIds: string[],
  options?: UseQueryOptions<TicketField_v1[], Error>
) {
  return useQuery({
    queryKey: ['ticketFields_v1', fieldIds],
    queryFn: async () => {
      const res = await http.get<TicketField_v1[]>(`/api/1/ticket-fields`, {
        params: {
          ids: fieldIds.join(','),
          includeVariant: true,
        },
      });
      return res.data;
    },
    ...options,
  });
}

async function translate(texts: string[]) {
  const filteredTexts = uniq(compact(texts.map((t) => t.trim())));
  if (filteredTexts.length === 0) {
    return {};
  }
  const { data } = await http.post<{ result: string[] }>('/api/1/translate', {
    text: filteredTexts.join('\n'),
  });
  return filteredTexts.reduce<Record<string, string>>((map, text, i) => {
    if (i < data.result.length) {
      map[text] = data.result[i];
    }
    return map;
  }, {});
}

export function useTranslation_v1(texts: string[]) {
  return useQuery({
    queryKey: ['Translation', texts],
    queryFn: () => translate(texts),
    enabled: texts.length > 0,
  });
}
