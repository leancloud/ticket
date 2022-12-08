import { ComponentPropsWithoutRef, memo, useEffect, useMemo, useRef } from 'react';
import { UseInfiniteQueryOptions, useInfiniteQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';
import { flatten, last } from 'lodash-es';
import OpenInBrowser from '@/components/OpenInBrowser';
import { http } from '@/leancloud';
import { Reply, Ticket } from '@/types';
import { Time } from '@/components/Time';
import { FileInfoWithKey, FileItems } from '@/components/FileItem';
import style from './index.module.css';

interface ReplyItemProps {
  data: Reply;
  isLast?: boolean;
}

function ReplyItem({ data, isLast }: ReplyItemProps) {
  const { t } = useTranslation();
  const files = useMemo<FileInfoWithKey<string>[] | undefined>(() => {
    return data.files?.map((file) => ({ ...file, key: file.id }));
  }, [data.files]);

  return (
    <div className="flex">
      <div className="shrink-0 flex flex-col">
        <div
          className={cx('shrink-0 flex w-[12px] h-[12px] rounded-full left-[-6px]', {
            'bg-tapBlue': data.isCustomerService,
            'bg-[#D9D9D9]': !data.isCustomerService,
          })}
        >
          <div className="m-auto bg-white w-[4px] h-[4px] rounded-full" />
        </div>
        {!isLast && <div className="grow mx-auto w-px bg-gray-100" />}
      </div>

      <div className="grow ml-2 pb-8 text-[#666]">
        <div className="text-xs leading-[12px]">
          <span className="mr-2">
            {data.isCustomerService ? t('reply.staff_title') : t('reply.my_title')}
          </span>
          <Time className="text-[#BFBFBF] whitespace-nowrap" value={new Date(data.createdAt)} />
        </div>
        <div
          className={cx('inline-block rounded-2xl rounded-tl-none mt-2 p-1 text-sm', {
            'bg-[#F2FDFE]': data.isCustomerService,
            'bg-[rgba(0,0,0,0.02)]': !data.isCustomerService,
          })}
        >
          {data.contentSafeHTML.length > 0 && (
            <OpenInBrowser.Content
              className={`${style.content} markdown-body`}
              dangerouslySetInnerHTML={{ __html: data.contentSafeHTML }}
            />
          )}
          {files && files.length > 0 && <FileItems className="ml-2 mt-2" files={files} />}
        </div>
      </div>
    </div>
  );
}

async function fetchReplies(ticketId: string, cursor?: string): Promise<Reply[]> {
  const { data } = await http.get<any[]>(`/api/2/tickets/${ticketId}/replies`, {
    params: {
      cursor: cursor || undefined,
    },
  });
  return data;
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
      const lastReply = last(flatten(allPages));
      return lastReply?.createdAt || '';
    },
  });
}

export interface RepliesProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  replies: Reply[];
  ticket: Ticket;
}

export function Replies({ replies, ticket, ...props }: RepliesProps) {
  const $container = useRef<HTMLDivElement>(null!);
  const $dummy = useRef<HTMLDivElement>(null!);

  const ticketAsReply = useMemo(() => {
    const mockedReply: Reply = {
      ...ticket,
      isCustomerService: false,
    };
    return mockedReply;
  }, []);

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
      {(ticketAsReply.contentSafeHTML.length > 0 || ticketAsReply.files) && (
        <ReplyItem key="ticket" data={ticketAsReply} />
      )}
      {replies.map((reply, index) => (
        <ReplyItem key={reply.id} data={reply} isLast={index === replies.length - 1} />
      ))}
      <div ref={$dummy} className="invisible" />
    </div>
  );
}
