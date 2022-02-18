import { http } from '@/leancloud';

export interface FileSchema {
  id: string;
  name: string;
  mime: string;
  url: string;
}

export async function fetchFile(id: string): Promise<FileSchema> {
  const { data } = await http.get(`/api/2/files/${id}`);
  return data;
}
