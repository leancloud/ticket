import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from 'react-query';
import { http } from '@/leancloud';

export interface TicketFormNoteSchema {
  id: string;
  title: string;
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FetchTicketFormNotesOptions {
  active?: boolean;
  page?: number;
  pageSize?: number;
}

async function fetchTicketFormNotes(options: FetchTicketFormNotesOptions = {}) {
  const res = await http.get<TicketFormNoteSchema[]>('/api/2/ticket-form-notes', {
    params: options,
  });
  return {
    totalCount: parseInt(res.headers['x-total-count']),
    data: res.data,
  };
}

async function fetchTicketFormNote(id: string) {
  const res = await http.get<TicketFormNoteSchema>(`/api/2/ticket-form-notes/${id}`);
  return res.data;
}

interface CreateTicketFormNoteData {
  title: string;
  content: string;
}

async function createTicketFormNote(data: CreateTicketFormNoteData) {
  const res = await http.post<TicketFormNoteSchema>('/api/2/ticket-form-notes', data);
  return res.data;
}

interface UpdateTicketFormNoteData {
  title?: string;
  content?: string;
  active?: boolean;
}

async function updateTicketFormNote(id: string, data: UpdateTicketFormNoteData) {
  const res = await http.patch<TicketFormNoteSchema>(`/api/2/ticket-form-notes/${id}`, data);
  return res.data;
}

interface UseTicketFormNotesOptions extends FetchTicketFormNotesOptions {
  queryOptions?: UseQueryOptions<{ totalCount: number; data: TicketFormNoteSchema[] }, Error>;
}

export function useTicketFormNotes({ queryOptions, ...options }: UseTicketFormNotesOptions = {}) {
  return useQuery({
    queryKey: ['ticketFormNotes', options],
    queryFn: () => fetchTicketFormNotes(options),
    ...queryOptions,
  });
}

export function useTicketFormNote(
  id: string,
  options?: UseQueryOptions<TicketFormNoteSchema, Error>
) {
  return useQuery({
    queryKey: ['ticketFormNote', id],
    queryFn: () => fetchTicketFormNote(id),
    ...options,
  });
}

export function useCreateTicketFormNote(
  options?: UseMutationOptions<TicketFormNoteSchema, Error, CreateTicketFormNoteData>
) {
  return useMutation({
    mutationFn: createTicketFormNote,
    ...options,
  });
}

export function useUpdateTicketFormNote(
  options?: UseMutationOptions<TicketFormNoteSchema, Error, Parameters<typeof updateTicketFormNote>>
) {
  return useMutation({
    mutationFn: (args) => updateTicketFormNote.apply(null, args),
    ...options,
  });
}
