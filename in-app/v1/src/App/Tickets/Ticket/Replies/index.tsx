import { useInfiniteQuery, UseInfiniteQueryOptions } from 'react-query';
import { useTranslation } from 'react-i18next';

import { http } from 'leancloud';
import { File, Reply } from 'types';
import { Time } from 'components/Time';
import { FileItem } from 'components/FileItem';
import { usePreview } from 'utils/usePreview';

interface ReplyItemProps {
  data: Reply;
  onPreviewFile: (file: File) => void;
}

function ReplyItem({ data, onPreviewFile }: ReplyItemProps) {
  const { t } = useTranslation();

  return (
    <div className="border-l-2 px-4 pb-8 relative box-border last:border-white last:pb-0">
      <div
        className={`rounded-full absolute -top-px -left-px p-1.5 transform -translate-x-1/2 ${
          data.isStaff ? 'bg-tapBlue' : 'bg-gray-200'
        }`}
      >
        <div className="bg-white w-1.5 h-1.5 rounded-full"></div>
      </div>
      <div className="text-xs">
        <span className="text-gray-500">
          {data.isStaff ? t('reply.staff_title') : t('reply.my_title')}
        </span>
        <Time className="ml-2 text-gray-300" value={data.createdAt} />
      </div>
      <div
        className={`inline-block rounded-2xl rounded-tl-none p-3 mt-2 text-gray-500 ${
          data.isStaff ? 'bg-tapBlue-100' : 'bg-gray-50'
        }`}
      >
        {data.content && <div>{data.content}</div>}
        {data.files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.files.map((file) => (
              <FileItem {...file} key={file.id} onClick={() => onPreviewFile(file)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function fetchReplies(ticketId: string, cursor?: string): Promise<Reply[]> {
  const { data } = await http.get<any[]>(`/api/1/tickets/${ticketId}/replies`, {
    params: {
      created_at_gt: cursor || undefined,
    },
  });
  return data.map((reply) => ({
    id: reply.id,
    content: reply.content,
    isStaff: reply.is_customer_service,
    files: reply.files,
    createdAt: new Date(reply.created_at),
  }));
}

export type UseRepliesOptions = Omit<
  UseInfiniteQueryOptions<Reply[]>,
  'queryKey' | 'queryFn' | 'getNextPageParam'
>;

export function useReplies(ticketId: string, options?: UseRepliesOptions) {
  return useInfiniteQuery<Reply[]>({
    ...options,
    queryKey: ['replies', { ticketId }],
    queryFn: ({ pageParam }) => fetchReplies(ticketId, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const replies = allPages.flat();
      const lastReply = replies[replies.length - 1];
      return lastReply?.createdAt.toISOString() || '';
    },
  });
}

export interface RepliesProps {
  replies: Reply[];
}

export function Replies({ replies }: RepliesProps) {
  const { element: previewElement, preview } = usePreview();

  return (
    <div className="m-6">
      {previewElement}
      {replies.map((reply) => (
        <ReplyItem key={reply.id} data={reply} onPreviewFile={preview} />
      ))}
    </div>
  );
}
