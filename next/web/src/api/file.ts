import { http } from '@/leancloud';

export interface FileSchema {
  id: string;
  name: string;
  mime: string;
  url: string;
}

export async function fetchFile(id: string) {
  const { data } = await http.get<FileSchema>(`/api/2/files/${id}`);
  return data;
}

export async function fetchFiles(ids: string[]) {
  const { data } = await http.get<FileSchema[]>('/api/2/files', {
    params: {
      id: ids.join(','),
    },
  });
  return data;
}
