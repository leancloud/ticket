import { useQuery, UseQueryOptions } from 'react-query';
import { http } from '@/leancloud';

export interface FieldItem {
  type: 'field';
  data: {
    id: string;
    type: 'text' | 'multi-line' | 'dropdown' | 'multi-select' | 'radios' | 'file';
    title: string;
    description: string;
    required: boolean;
    options?: { title: string; value: string }[];
    pattern?: string;
  };
}

interface NoteItem {
  type: 'note';
  data: {
    id: string;
    content: string;
  };
}

export type TicketFormItem = FieldItem | NoteItem;

async function fetchTicketFormItems(id: string, locale?: string) {
  const res = await http.get<TicketFormItem[]>(`/api/2/ticket-forms/${id}/items`, {
    params: { locale },
  });
  return res.data;
}

export function useTicketFormItems(id: string, options?: UseQueryOptions<TicketFormItem[], Error>) {
  return useQuery({
    queryKey: ['ticketFormItems', id],
    queryFn: () => fetchTicketFormItems(id),
    ...options,
  });
}
