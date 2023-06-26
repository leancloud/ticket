import { useMutation, UseMutationOptions } from 'react-query';

import { http } from '@/leancloud';
import { FileSchema } from './file';
import { UserSchema } from './user';

export interface ReplySchema {
  id: string;
  content: string;
  contentSafeHTML: string;
  author: UserSchema;
  isCustomerService: boolean;
  internal?: boolean;
  files?: FileSchema[];
  createdAt: string;
  updatedAt: string;
}

interface UpdateReplyData {
  content?: string;
  fileIds?: string[];
}

async function updateReply(id: string, data: UpdateReplyData) {
  await http.patch(`/api/2/replies/${id}`, data);
}

export function useUpdateReply(
  options?: UseMutationOptions<void, Error, Parameters<typeof updateReply>>
) {
  return useMutation({
    mutationFn: (args) => updateReply(...args),
    ...options,
  });
}
