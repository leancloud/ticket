import {
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  useQuery,
} from 'react-query';

import { QueryWrapper } from 'components/QueryWrapper';
import { Time } from 'components/Time';
import { FileItem } from 'components/FileItem';
import { TicketFile } from '..';
import { http } from 'leancloud';

interface TimelineItemProps {
  date: Date;
  isStaff?: boolean;
  content: string;
  files?: TicketFile[];
}

function TimelineItem({ date, isStaff, content, files }: TimelineItemProps) {
  return (
    <div className="border-l-2 px-4 pb-8 relative box-border last:border-white last:pb-0">
      <div
        className={`rounded-full absolute top-0 -left-px p-1.5 transform -translate-x-1/2 ${
          isStaff ? 'bg-tapBlue-600' : 'bg-gray-200'
        }`}
      >
        <div className="bg-white w-1.5 h-1.5 rounded-full"></div>
      </div>
      <div className="text-xs">
        <span className="text-gray-500">{isStaff ? '官方客服' : '我自己'}</span>
        <Time className="ml-2 text-gray-300" value={date} />
      </div>
      <div
        className={`inline-block rounded-2xl rounded-tl-none px-3 pt-3 mt-2 text-gray-500 ${
          isStaff ? 'bg-tapBlue-100' : 'bg-gray-50'
        }`}
      >
        {content && <div className="pb-3">{content}</div>}
        {files && (
          <div className="flex flex-wrap">
            {files.map(({ id, name, mime, url }) => (
              <FileItem key={id} name={name} mime={mime} url={url} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export interface RawReply {
  id: string;
  content: string;
  is_customer_service: boolean;
  files: TicketFile[];
  created_at: string;
}

export interface Reply {
  id: string;
  content: string;
  isStaff: boolean;
  files: TicketFile[];
  createdAt: Date;
}

async function fetchReplies(ticketId: string, cursor?: string): Promise<Reply[]> {
  const { data } = await http.get<RawReply[]>(`/api/1/tickets/${ticketId}/replies`, {
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
      console.log(lastPage, allPages);
      const replies = allPages.flat();
      const lastReply = replies[replies.length - 1];
      return lastReply?.createdAt.toISOString() || '';
    },
  });
}

export interface TimelineProps {
  repliesResult: UseInfiniteQueryResult<Reply[]>;
}

export function Timeline({ repliesResult }: TimelineProps) {
  return (
    <QueryWrapper result={repliesResult}>
      {(replies) => (
        <div className="m-6">
          {replies.pages.flat().map(({ id, isStaff, content, files, createdAt }) => (
            <TimelineItem
              key={id}
              isStaff={isStaff}
              content={content}
              date={createdAt}
              files={files}
            />
          ))}
        </div>
      )}
    </QueryWrapper>
  );
}
