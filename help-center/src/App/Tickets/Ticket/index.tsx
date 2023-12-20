import {
  ComponentPropsWithoutRef,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InfiniteData, useMutation, useQueryClient } from 'react-query';
import { Time } from '@/components/Time';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid';
import { flatten, last } from 'lodash-es';
import { produce } from 'immer';
import { Helmet } from 'react-helmet-async';

import { auth, db, http } from '@/leancloud';
import { Reply, Ticket } from '@/types';
import { QueryWrapper } from '@/components/QueryWrapper';
import styles from './index.module.css';
import { Replies, useReplies } from './Replies';
import { Evaluated, NewEvaluation } from './Evaluation';
import { ReplyData, ReplyInput } from './ReplyInput';
import { useTicket } from '@/api/ticket';

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

export const RESOLVED_STATUS = [220, 250, 280];
export const UNRESOLVED_STATUS = [50, 120, 160];
export enum TicketResolvedStatus {
  resolved = '220,250,280',
  unResolved = '50,120,160',
}

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
    <div>
      <label className="min-w-[2em] max-w-[8em] text-neutral-600">{title}</label>{' '}
      <span className="overflow-hidden">{children}</span>
    </div>
  );
}

function TicketAttributes({ ticket }: { ticket: Ticket }) {
  const { t } = useTranslation();

  return (
    <div className="shrink-0 bg-background py-3 px-4 rounded-md">
      <div className={`flex flex-wrap justify-between gap-x-16 gap-y-2`}>
        <TicketAttribute title={t('general.number')}>#{ticket.nid}</TicketAttribute>
        <TicketAttribute title={t('general.title')}>{ticket.title}</TicketAttribute>
        <TicketAttribute title={t('general.status')}>
          <TicketStatus status={ticket.status} />
        </TicketAttribute>
        <TicketAttribute title={t('general.create_time')}>
          <Time value={new Date(ticket.createdAt)} />
        </TicketAttribute>
      </div>
    </div>
  );
}

async function commitReply(ticketId: string, data: ReplyData) {
  await http.post(`/api/2/tickets/${ticketId}/replies`, data);
}

function useClearLocalUnreadCount() {
  const queryClient = useQueryClient();
  return useCallback(
    (ticketId: string) => {
      queryClient.setQueriesData<InfiniteData<Ticket[]> | undefined>(['tickets'], (data) => {
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

type Action = 'create' | 'update' | 'delete';

function useWatchReply(
  ticketId: string,
  callBack: (action: Action, reply: { id: string; createdAt: Date }) => void
) {
  const $cb = useRef(callBack);
  $cb.current = callBack;

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
        subscription.on('create', (reply) => $cb.current('create', reply));
        subscription.on('update', (reply) => {
          if (reply.data.deletedAt) {
            $cb.current('delete', reply);
          }
        });
      });

    return () => {
      unsubscribe?.();
      unmounted = true;
    };
  }, [ticketId]);
}

function useWatchStatus(ticketId: string, callback: (status: number) => void) {
  const $cb = useRef(callback);
  $cb.current = callback;

  useEffect(() => {
    let unsubscribe: (() => any) | undefined;
    let unmounted = false;

    db.class('Ticket')
      .where('objectId', '==', ticketId)
      .subscribe()
      .then((subscription) => {
        if (unmounted) {
          return subscription.unsubscribe();
        }
        unsubscribe = () => subscription.unsubscribe();
        subscription.on('update', (ticket) => {
          callback(ticket.data.status);
        });
      });

    return () => {
      unsubscribe?.();
      unmounted = true;
    };
  }, [ticketId]);
}

async function commitEvaluation(ticketId: string, data: Ticket['evaluation']) {
  await http.patch(`/api/2/tickets/${ticketId}`, { evaluation: data });
}

export default function TicketDetail() {
  const params = useParams();
  const id = params.id!;
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
  });

  const queryClient = useQueryClient();

  useWatchReply(id, (action, reply) => {
    switch (action) {
      case 'create':
        const lastReply = last(replies);
        if (!lastReply || reply.createdAt > new Date(lastReply.createdAt)) {
          fetchMoreReplies();
          clearLocalUnreadCount(id);
        }
        break;
      case 'delete':
        const replyId = reply.id;
        queryClient.setQueryData<InfiniteData<Reply[]> | undefined>(
          ['replies', { ticketId: id }],
          (data) => {
            if (data) {
              return produce(data, (draft) => {
                for (const page of draft.pages) {
                  for (let i = 0; i < page.length; ++i) {
                    if (page[i].id === replyId) {
                      page.splice(i, 1);
                      return;
                    }
                  }
                }
              });
            }
          }
        );
        break;
    }
  });

  useWatchStatus(id, (status) => {
    queryClient.setQueryData<Ticket | undefined>(['ticket', id], (data) => {
      if (data) {
        return {
          ...data,
          status,
        };
      }
    });
  });

  const [editEval, setEditEval] = useState(false);

  const { mutate: evaluate, isLoading: isEvaluating } = useMutation({
    mutationFn: (data: Ticket['evaluation']) => commitEvaluation(id, data),
    onSuccess: (_, evaluation) => {
      setEditEval(false);
      queryClient.setQueryData<Ticket | undefined>(['ticket', id], (data) => {
        if (data) {
          return produce(data, (draft) => {
            draft.evaluation = evaluation;
          });
        }
      });
    },
  });

  return (
    <div className="content">
      <Helmet>{ticket?.title && <title>{ticket.title}</title>}</Helmet>
      <div className="text-xl text-center">{t('ticket.record')}</div>
      {ticket && (
        <>
          <div className="mt-6 mb-4">
            <TicketAttributes ticket={ticket} />
          </div>
        </>
      )}
      <div className="border rounded-md">
        {ticket && (
          <Replies className="grow px-4 pt-3 min-h-[200px]" replies={replies} ticket={ticket} />
        )}

        {ticket &&
          (ticketIsClosed ? (
            editEval || !ticket.evaluation ? (
              <NewEvaluation
                initData={ticket.evaluation}
                loading={isEvaluating}
                onSubmit={evaluate}
              />
            ) : (
              <Evaluated onClickChangeButton={() => setEditEval(true)} />
            )
          ) : (
            <ReplyInput onCommit={reply} />
          ))}
      </div>
    </div>
  );
}
