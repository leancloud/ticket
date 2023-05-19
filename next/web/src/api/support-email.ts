import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from 'react-query';

import { http } from '@/leancloud';

export interface SupportEmailSchema {
  id: string;
  name: string;
  email: string;
  auth: {
    username: string;
    password: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
  imap: {
    host: string;
    port: number;
    secure: boolean;
  };
  categoryId: string;
  receipt: {
    enabled: boolean;
    subject: string;
    text: string;
  };
}

async function fetchSupportEmails() {
  const res = await http.get<SupportEmailSchema[]>('/api/2/support-emails');
  return res.data;
}

async function fetchSupportEmail(id: string) {
  const res = await http.get<SupportEmailSchema>(`/api/2/support-emails/${id}`);
  return res.data;
}

export function useSupportEmails(options?: UseQueryOptions<SupportEmailSchema[], Error>) {
  return useQuery({
    queryKey: ['supportEmails'],
    queryFn: fetchSupportEmails,
    ...options,
  });
}

export function useSupportEmail(id: string, options?: UseQueryOptions<SupportEmailSchema, Error>) {
  return useQuery({
    queryKey: ['supportEmail', id],
    queryFn: () => fetchSupportEmail(id),
    ...options,
  });
}

interface CreateSupportEmailData {
  name: string;
  email: string;
  auth: {
    username: string;
    password: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
  imap: {
    host: string;
    port: number;
    secure: boolean;
  };
  mailbox?: string;
  categoryId: string;
  receipt: {
    enabled: boolean;
    subject: string;
    text: string;
  };
}

async function createSupportEmail(data: CreateSupportEmailData) {
  const res = await http.post<SupportEmailSchema>('/api/2/support-emails', data);
  return res.data;
}

type UpdateSupportEmailData = Partial<CreateSupportEmailData>;

async function updateSupportEmail(id: string, data: UpdateSupportEmailData) {
  const res = await http.patch<SupportEmailSchema>(`/api/2/support-emails/${id}`, data);
  return res.data;
}

export function useCreateSupportEmail(
  options?: UseMutationOptions<SupportEmailSchema, Error, CreateSupportEmailData>
) {
  return useMutation({
    mutationFn: createSupportEmail,
    ...options,
  });
}

export function useUpdateSupportEmail(
  options?: UseMutationOptions<SupportEmailSchema, Error, Parameters<typeof updateSupportEmail>>
) {
  return useMutation({
    mutationFn: (args) => updateSupportEmail(...args),
    ...options,
  });
}

async function deleteSupportEmail(id: string) {
  await http.delete(`/api/2/support-emails/${id}`);
}

export function useDeleteSupportEmail(options?: UseMutationOptions<void, Error, string>) {
  return useMutation({
    mutationFn: deleteSupportEmail,
    ...options,
  });
}
