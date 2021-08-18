import { ComponentPropsWithoutRef, useEffect, useMemo, useRef } from 'react';
import { UseInfiniteQueryOptions, useInfiniteQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import { http } from 'leancloud';
import { Reply } from 'types';
import { Time } from 'components/Time';
import { FileInfoWithKey, FileItems } from 'components/FileItem';

interface ReplyItemProps {
  data: Reply;
  isLast?: boolean;
}

function ReplyItem({ data, isLast }: ReplyItemProps) {
  const { t } = useTranslation();
  const files = useMemo<FileInfoWithKey<string>[]>(() => {
    return data.files.map((file) => ({ ...file, key: file.id }));
  }, [data.files]);

  return (
    <div className="flex">
      <div className="flex-shrink-0 flex flex-col">
        <div
          className={cx('flex-shrink-0 flex w-[12px] h-[12px] rounded-full left-[-6px]', {
            'bg-tapBlue': data.isStaff,
            'bg-[#D9D9D9]': !data.isStaff,
          })}
        >
          <div className="m-auto bg-white w-[4px] h-[4px] rounded-full" />
        </div>
        {!isLast && <div className="flex-grow mx-auto w-px bg-gray-100" />}
      </div>

      <div className="flex-grow ml-2 pb-8 text-[#666]">
        <div className="text-xs leading-[12px]">
          <span className="mr-2">
            {data.isStaff ? t('reply.staff_title') : t('reply.my_title')}
          </span>
          <Time className="text-[#BFBFBF] whitespace-nowrap" value={data.createdAt} />
        </div>
        <div
          className={cx('inline-block rounded-2xl rounded-tl-none mt-2 p-1 text-sm', {
            'bg-[#F2FDFE]': data.isStaff,
            'bg-[rgba(0,0,0,0.02)]': !data.isStaff,
          })}
        >
          {data.content.length > 0 && (
            <div className="m-2 whitespace-pre-line break-all">{data.content}</div>
          )}
          {files.length > 0 && <FileItems className="ml-2 mt-2" files={files} />}
        </div>
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

export interface RepliesProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  replies: Reply[];
}

export function Replies({ replies, ...props }: RepliesProps) {
  const $container = useRef<HTMLDivElement>(null!);
  const $dummy = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    const scrollToButtom = () => $dummy.current.scrollIntoView();
    scrollToButtom();
    const ob = new MutationObserver(scrollToButtom);
    ob.observe($container.current, { childList: true });
    return () => {
      ob.disconnect();
    };
  }, []);

  return (
    <div {...props} ref={$container}>
      {replies.map((reply, index) => (
        <ReplyItem key={reply.id} data={reply} isLast={index === replies.length - 1} />
      ))}
      <div ref={$dummy} className="invisible" />
    </div>
  );
}
