import { useQuery } from 'react-query';
import classNames from 'classnames';

import { QueryWrapper } from 'components/QueryWrapper';
import { Time } from 'components/Time';
import { FileItem } from 'components/FileItem';

export interface UploadedFileProps {
  fileIds: string[];
}

export function UploadedFiles({ fileIds }: UploadedFileProps) {
  return (
    <div className="flex flex-wrap">
      {fileIds.map((id) => (
        <FileItem key={id} name="Loading..." />
      ))}
    </div>
  );
}

interface TimelineItemProps {
  date: Date;
  staff?: boolean;
  content: string;
  fileIds?: string[];
}

function TimelineItem({ date, staff, content, fileIds }: TimelineItemProps) {
  return (
    <div className="border-l-2 px-4 pb-8 relative box-border last:border-white last:pb-0">
      <div
        className={classNames(
          'rounded-full absolute top-0 -left-px p-1.5 transform -translate-x-1/2',
          {
            'bg-gray-200': !staff,
            'bg-tapBlue-600': staff,
          }
        )}
      >
        <div className="bg-white w-1.5 h-1.5 rounded-full"></div>
      </div>
      <div className="text-xs">
        <span className="text-gray-500">{staff ? '官方客服' : '我自己'}</span>
        <Time className="ml-2 text-gray-300" value={date} />
      </div>
      <div
        className={`rounded-2xl rounded-tl-none px-3 pt-3 mt-2 text-gray-500 ${
          staff ? 'bg-tapBlue-100' : 'bg-gray-50'
        }`}
      >
        {content && <div className="pb-3">{content}</div>}
        {fileIds && <UploadedFiles fileIds={fileIds} />}
      </div>
    </div>
  );
}

export interface Reply {
  id: string;
  content: string;
  isStaff: boolean;
  fileIds: string[];
  createdAt: Date;
}

function fetchReplies(): Promise<Reply[]> {
  const replies: Reply[] = [
    {
      id: 'reply-1',
      content:
        '您好，根据您提供的情况，我们无法判断问题的关键，麻烦您提供具体的详细信息越详细越好。谢谢',
      isStaff: true,
      fileIds: [],
      createdAt: new Date(),
    },
    {
      id: 'reply-2',
      content: '麻烦客服小姐姐，帮我看一下是什么问题啊...',
      fileIds: ['114514'],
      isStaff: false,
      createdAt: new Date(),
    },
  ];
  return new Promise((resolve) => {
    setTimeout(() => resolve(replies), 500);
  });
}

export function useReplies(ticketId: string) {
  return useQuery({
    queryKey: ['replies', { ticketId }],
    queryFn: () => fetchReplies(),
  });
}

export interface TimelineProps {
  ticketId: string;
}

export function Timeline({ ticketId }: TimelineProps) {
  const result = useReplies(ticketId);

  return (
    <QueryWrapper result={result}>
      {(replies) => (
        <div className="m-6">
          {replies.map(({ id, isStaff, content, fileIds, createdAt }) => (
            <TimelineItem
              key={id}
              staff={isStaff}
              content={content}
              date={createdAt}
              fileIds={fileIds.length ? fileIds : undefined}
            />
          ))}
        </div>
      )}
    </QueryWrapper>
  );
}
