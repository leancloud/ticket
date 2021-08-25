import {
  ComponentPropsWithoutRef,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InfiniteData, UseQueryOptions, useMutation, useQuery, useQueryClient } from 'react-query';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid';
import { flatten, last } from 'lodash-es';
import { produce } from 'immer';

import { PageContent, PageHeader } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import styles from './index.module.css';
import { Replies, useReplies } from './Replies';
import { Evaluated, NewEvaluation } from './Evaluation';
import { auth, db, http } from 'leancloud';
import { Reply, Ticket } from 'types';
import { ReplyData, ReplyInput } from './ReplyInput';

async function fetchTicket(id: string): Promise<Ticket> {
  const { data } = await http.get('/api/1/tickets/' + id);
  return {
    id: data.id,
    nid: data.nid,
    title: data.title,
    content: data.content,
    status: data.status,
    files: data.files,
    evaluation: data.evaluation,
    unreadCount: data.unread_count,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export function useTicket(id: string, options?: UseQueryOptions<Ticket>) {
  return useQuery({
    ...options,
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id),
  });
}

const STATUS_CLASS: Record<number, string> = {
  50: styles.new,
  120: styles.waitForStaff,
  160: styles.waitForCustomer,
  220: styles.resolved,
  250: styles.resolved,
  280: styles.resolved,
};

const STATUS_TEXT: Record<number, string> = {
  50: 'status.new',
  120: 'status.waiting_on_staff',
  160: 'status.waiting_on_customer',
  220: 'status.resolved',
  250: 'status.resolved',
  280: 'status.resolved',
};

export interface TicketStatusProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  status: number;
}

export function TicketStatus({ status, ...props }: TicketStatusProps) {
  const { t } = useTranslation();
  return (
    <span {...props} className={cx(styles.status, STATUS_CLASS[status], props.className)}>
      {t(STATUS_TEXT[status])}
    </span>
  );
}

interface ExpandButtonProps {
  expand: boolean;
  onClick: () => void;
}

function ExpandButton({ expand, onClick }: ExpandButtonProps) {
  const { t } = useTranslation();

  return (
    <button className="mx-auto text-tapBlue" onClick={onClick}>
      {expand ? (
        <>
          {t('general.collapse')}
          <ChevronUpIcon className="w-5 h-5 inline-block" />
        </>
      ) : (
        <>
          {t('general.expand')}
          <ChevronDownIcon className="w-5 h-5 inline-block" />
        </>
      )}
    </button>
  );
}

function TicketAttribute({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <>
      <label className="min-w-[2em] max-w-[5em] text-[#BFBFBF]">{title}</label>
      <div className="text-[#666] overflow-hidden">{children}</div>
    </>
  );
}

function TicketAttributes({ ticket }: { ticket: Ticket }) {
  const { t } = useTranslation();
  const [expand, setExpand] = useState(false);

  return (
    <div className="flex-shrink-0 bg-[#FAFAFA] border-b border-gray-100 text-sm px-4 pt-4">
      <div className={`${styles.dataGrid} gap-x-4 ${expand ? 'gap-y-2' : 'gap-y-1'}`}>
        {expand && <TicketAttribute title={t('general.number')}>#{ticket.nid}</TicketAttribute>}
        {expand && (
          <TicketAttribute title={t('general.status')}>
            <TicketStatus status={ticket.status} />
          </TicketAttribute>
        )}
        <TicketAttribute title={t('general.title')}>
          <div className={cx({ truncate: !expand })}>{ticket.title}</div>
        </TicketAttribute>
        <TicketAttribute title={t('general.description')}>
          <div className={cx({ truncate: !expand })}>{ticket.content}</div>
        </TicketAttribute>
      </div>
      <div className="text-center mt-4 mb-1">
        <ExpandButton expand={expand} onClick={() => setExpand(!expand)} />
      </div>
    </div>
  );
}

async function commitReply(ticketId: string, data: ReplyData) {
  await http.post(`/api/1/tickets/${ticketId}/replies`, data);
}

function useClearLocalUnreadCount() {
  const queryClient = useQueryClient();
  return useCallback(
    (ticketId: string) => {
      console.log(ticketId);
      queryClient.setQueryData<InfiniteData<Ticket[]> | undefined>('tickets', (data) => {
        if (data) {
          return produce(data, (draft) => {
            for (const page of draft.pages) {
              for (const ticket of page) {
                if (ticket.id === ticketId) {
                  ticket.unreadCount = 0;
                  return;
                }
              }
            }
          });
        }
      });
    },
    [queryClient]
  );
}

function useWatchNewReply(
  ticketId: string,
  onCreate: (reply: { id: string; createdAt: Date }) => void
) {
  const $onCreate = useRef(onCreate);
  $onCreate.current = onCreate;

  useEffect(() => {
    let unsubscribe: (() => any) | undefined;
    let unmounted = false;

    db.class('Reply')
      .where('ticket', '==', db.class('Ticket').object(ticketId))
      .where('author', '!=', auth.currentUser)
      .subscribe()
      .then((subscription) => {
        if (unmounted) {
          return subscription.unsubscribe();
        }
        unsubscribe = () => subscription.unsubscribe();
        subscription.on('create', (reply) => $onCreate.current(reply));
      });

    return () => {
      unsubscribe?.();
      unmounted = true;
    };
  }, [ticketId]);
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const clearLocalUnreadCount = useClearLocalUnreadCount();
  useEffect(() => clearLocalUnreadCount(id), [id]);

  const result = useTicket(id);
  const { data: ticket } = result;

  const ticketIsClosed = useMemo(() => {
    return ticket !== undefined && ticket.status >= 200;
  }, [ticket]);

  const repliesResult = useReplies(id);
  const { data: replyPages, fetchNextPage: fetchMoreReplies } = repliesResult;

  const replies = useMemo<Reply[]>(() => flatten(replyPages?.pages), [replyPages]);

  const { mutateAsync: reply } = useMutation({
    mutationFn: (data: ReplyData) => commitReply(id, data),
    onSuccess: () => fetchMoreReplies(),
    onError: (error: Error) => alert(error.message),
  });

  useWatchNewReply(id, (reply) => {
    const lastReply = last(replies);
    if (!lastReply || reply.createdAt > lastReply.createdAt) {
      fetchMoreReplies();
      clearLocalUnreadCount(id);
    }
  });

  return (
    <>
      <PageHeader>{t('ticket.detail')}</PageHeader>
      <PageContent className={cx({ 'mb-0 rounded-b-none': !ticketIsClosed })}>
        <QueryWrapper result={result}>
          <QueryWrapper result={repliesResult}>
            {ticket && <TicketAttributes ticket={ticket} />}

            <Replies className="flex-grow px-4 pt-4" replies={replies} />

            {ticket &&
              (ticketIsClosed ? (
                ticket.evaluation ? (
                  <Evaluated />
                ) : (
                  <NewEvaluation ticketId={id} />
                )
              ) : (
                <ReplyInput onCommit={reply} />
              ))}
          </QueryWrapper>
        </QueryWrapper>
      </PageContent>
    </>
  );
}
