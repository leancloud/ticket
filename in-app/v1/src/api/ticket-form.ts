import { useQuery, UseQueryOptions } from 'react-query';
import { http } from '@/leancloud';
import { useTranslation } from 'react-i18next';

export interface FieldItem {
  type: 'field';
  data: {
    id: string;
    type: 'text' | 'multi-line' | 'dropdown' | 'multi-select' | 'radios' | 'file';
    title: string;
    description: string;
    required: boolean;
    options?: { title: string; value: string }[];
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
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ['ticketFormItems', id],
    queryFn: () => fetchTicketFormItems(id, i18n.language),
    ...options,
  });
}
