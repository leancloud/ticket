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

export function useSupportEmails(options?: UseQueryOptions<SupportEmailSchema[], Error>) {
  return useQuery({
    queryKey: ['supportEmails'],
    queryFn: fetchSupportEmails,
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

export function useCreateSupportEmail(
  options?: UseMutationOptions<SupportEmailSchema, Error, CreateSupportEmailData>
) {
  return useMutation({
    mutationFn: createSupportEmail,
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
