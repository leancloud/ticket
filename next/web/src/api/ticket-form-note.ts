import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from 'react-query';
import { http } from '@/leancloud';

export interface TicketFormNoteSchema {
  id: string;
  name: string;
  defaultLanguage: string;
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

async function fetchTicketFormNotesWithDetail(options: FetchTicketFormNotesOptions = {}) {
  const res = await http.get<
    (TicketFormNoteSchema & Pick<TicketFormNoteTranslationSchema, 'content'>)[]
  >('/api/2/ticket-form-notes/detail', {
    params: options,
  });
  return {
    totalCount: parseInt(res.headers['x-total-count']),
    data: res.data,
  };
}

async function fetchTicketFormNoteDetail(id: string) {
  const res = await http.get<TicketFormNoteSchema & { languages: string[] }>(
    `/api/2/ticket-form-notes/${id}/detail`
  );
  return res.data;
}

interface CreateTicketFormNoteData {
  name: string;
  content: string;
  language: string;
}

async function createTicketFormNote(data: CreateTicketFormNoteData) {
  const res = await http.post<TicketFormNoteSchema>('/api/2/ticket-form-notes', data);
  return res.data;
}

interface UpdateTicketFormNoteData {
  name?: string;
  defaultLanguage?: string;
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

interface UseTicketFormNotesWithDetailOptions extends FetchTicketFormNotesOptions {
  queryOptions?: UseQueryOptions<
    {
      totalCount: number;
      data: (TicketFormNoteSchema & Pick<TicketFormNoteTranslationSchema, 'content'>)[];
    },
    Error
  >;
}

export function useTicketFormNotesWithDetail({
  queryOptions,
  ...options
}: UseTicketFormNotesWithDetailOptions) {
  return useQuery({
    queryKey: ['ticketFormNotesWithDetail', options],
    queryFn: () => fetchTicketFormNotesWithDetail(options),
    ...queryOptions,
  });
}

export function useTicketFormNoteDetail(
  id: string,
  options?: UseQueryOptions<TicketFormNoteSchema & { languages: string[] }, Error>
) {
  return useQuery({
    queryKey: ['ticketFormNote', id],
    queryFn: () => fetchTicketFormNoteDetail(id),
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

export interface TicketFormNoteTranslationSchema {
  content: string;
  language: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const fetchTicketFormNoteTranslation = async (id: string, language: string) => {
  const res = await http.get<TicketFormNoteTranslationSchema>(
    `/api/2/ticket-form-notes/${id}/${language}`
  );

  return res.data;
};

export const UseTicketFormNoteTranslationKey = 'ticketFormNoteTranslation';

export const useTicketFormNoteTranslation = (
  id: string,
  language: string,
  options?: UseQueryOptions<TicketFormNoteTranslationSchema, Error>
) =>
  useQuery({
    queryFn: () => fetchTicketFormNoteTranslation(id, language),
    queryKey: [UseTicketFormNoteTranslationKey, id, language],
    ...options,
  });

export interface CreateTicketFormNoteTranslationData {
  language: string;
  content: string;
}

const createTicketFormNoteTranslation = async (
  id: string,
  data: CreateTicketFormNoteTranslationData
) => {
  const res = await http.post<TicketFormNoteTranslationSchema>(
    `/api/2/ticket-form-notes/${id}`,
    data
  );
  return res.data;
};

export const useCreateTicketFormNoteTranslation = (
  id: string,
  options?: UseMutationOptions<
    TicketFormNoteTranslationSchema,
    Error,
    CreateTicketFormNoteTranslationData
  >
) =>
  useMutation({
    mutationFn: (data) => createTicketFormNoteTranslation(id, data),
    ...options,
  });

export interface UpdateTicketFormNoteTranslationData
  extends Partial<Omit<CreateTicketFormNoteTranslationData, 'language'>> {
  active?: boolean;
}

const updateTicketFormNoteTranslation = async (
  id: string,
  language: string,
  data: UpdateTicketFormNoteTranslationData
) => {
  const res = await http.patch<TicketFormNoteTranslationSchema>(
    `/api/2/ticket-form-notes/${id}/${language}`,
    data
  );
  return res.data;
};

export const useUpdateTicketFormNoteTranslation = (
  id: string,
  language: string,
  options?: UseMutationOptions<
    TicketFormNoteTranslationSchema,
    Error,
    UpdateTicketFormNoteTranslationData
  >
) =>
  useMutation({
    mutationFn: (data) => updateTicketFormNoteTranslation(id, language, data),
    ...options,
  });
