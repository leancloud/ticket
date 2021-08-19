import {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { InfiniteData, UseQueryOptions, useMutation, useQuery, useQueryClient } from 'react-query';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid';
import { flatten, last } from 'lodash-es';
import { produce } from 'immer';

import { PageContent, PageHeader } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { FileItems } from 'components/FileItem';
import { Button } from 'components/Button';
import ClipIcon from 'icons/Clip';
import styles from './index.module.css';
import { Replies, useReplies } from './Replies';
import { Evaluated, NewEvaluation } from './Evaluation';
import { auth, db, http } from 'leancloud';
import { Reply, Ticket } from 'types';
import { useUpload } from 'utils/useUpload';

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

interface MiniUploaderProps {
  className?: string;
  onUpload: (files: FileList) => void;
}

function MiniUploader({ className, onUpload }: MiniUploaderProps) {
  const $input = useRef<HTMLInputElement>(null!);
  const handleUpload = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      const files = e.target.files;
      if (files?.length) {
        onUpload(files);
        $input.current!.value = '';
      }
    },
    [onUpload]
  );

  return (
    <button
      className={cx('flex', className)}
      onClick={() => $input.current.click()}
      onTouchStart={(e) => e.preventDefault()}
      onTouchEnd={(e) => {
        e.preventDefault();
        $input.current.click();
      }}
    >
      <input className="hidden" type="file" ref={$input} onChange={handleUpload} />
      <ClipIcon className="m-auto text-tapBlue" />
    </button>
  );
}

interface ReplyData {
  content: string;
  file_ids: string[];
}

interface ReplyInputProps {
  onCommit: (data: ReplyData) => void | Promise<void>;
  disabled?: boolean;
}

function ReplyInput({ onCommit, disabled }: ReplyInputProps) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [content, setContent] = useState('');
  const { files, isUploading, upload, remove, removeAll } = useUpload();
  const submitable = useMemo(() => {
    return !isUploading && (content.trim() || files.length);
  }, [files, isUploading, content]);

  const handleChangeContent = useCallback((content: string) => setContent(content), []);

  // TODO: 上传文件后滚动到底部

  const handleCommit = async () => {
    try {
      await onCommit({
        content: content.trim(),
        file_ids: files.map((file) => file.id!),
      });
      setContent('');
      setShow(false);
      removeAll();
    } catch {}
  };

  const $editor = useRef<HTMLDivElement>(null);
  const $content = useRef(content);
  $content.current = content;
  useEffect(() => {
    if (show) {
      $editor.current!.innerText = $content.current;
      $editor.current!.focus();
    }
  }, [show]);

  return (
    <>
      <div
        className={cx(
          'sticky bottom-0 border-t border-gray-100 bg-[#FAFAFA] pb-[env(safe-area-inset-bottom)]',
          {
            invisible: show,
          }
        )}
      >
        <div className="flex items-center px-3 py-2">
          <input
            className="flex-grow h-8 px-3 border rounded-full placeholder-[#BFBFBF] text-sm"
            placeholder={t('reply.input_content_hint')}
            value={content}
            onChange={(e) => handleChangeContent(e.target.value)}
            onFocus={() => setShow(true)}
          />
          <Button
            className="flex-shrink-0 ml-2 w-16 leading-[30px] text-[13px]"
            disabled={!submitable || disabled}
            onClick={handleCommit}
          >
            {t('general.send')}
          </Button>
        </div>
      </div>

      {show &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.3)]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShow(false);
              }
            }}
          >
            <div className="fixed left-0 right-0 bottom-0 z-50 bg-[#FAFAFA] border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
              <div className="relative flex items-end px-3 py-2">
                <div className="relative bg-white flex-grow rounded-[16px] border pl-3 pr-[34px] max-h-[200px] sm:max-h-[140px] overflow-y-auto text-sm">
                  <div
                    ref={$editor}
                    contentEditable
                    className="outline-none leading-[16px] my-[7px] whitespace-pre-line"
                    onInput={(e) => {
                      handleChangeContent((e.target as HTMLDivElement).innerText);
                    }}
                  />
                  {(content.length === 0 || content === '\n') && (
                    <div className="absolute left-3 top-0 leading-[30px] text-[#BFBFBF]">
                      {t('reply.input_content_hint')}
                    </div>
                  )}

                  {files.length > 0 && (
                    <FileItems
                      files={files}
                      previewable={false}
                      onDelete={(file) => remove(file.key)}
                    />
                  )}
                </div>

                <MiniUploader
                  className="absolute right-[85px] bottom-[9px] w-[34px] h-[30px]"
                  onUpload={(files) => upload(files[0])}
                />

                <Button
                  className="relative bottom-px flex-shrink-0 w-16 ml-2 leading-[30px] text-[13px]"
                  disabled={!submitable || disabled}
                  onClick={handleCommit}
                >
                  {t('general.send')}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

async function commitReply(ticketId: string, data: ReplyData) {
  await http.post(`/api/1/tickets/${ticketId}/replies`, data);
}

function useClearUnreadCount() {
  const queryClient = useQueryClient();
  return useCallback(
    (ticketId: string) => {
      http.patch(`/api/1/tickets/${ticketId}`, { unread_count: 0 });
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
  const clearUnreadCount = useClearUnreadCount();

  const result = useTicket(id, {
    onSuccess: (ticket) => ticket.unreadCount && clearUnreadCount(ticket.id),
  });
  const { data: ticket } = result;

  const ticketIsClosed = useMemo(() => {
    return ticket !== undefined && ticket.status >= 200;
  }, [ticket]);

  const repliesResult = useReplies(id);
  const { data: replyPages, fetchNextPage: fetchMoreReplies } = repliesResult;

  const replies = useMemo<Reply[]>(() => flatten(replyPages?.pages), [replyPages]);

  const { mutateAsync: reply, isLoading: committing } = useMutation({
    mutationFn: (data: ReplyData) => commitReply(id, data),
    onSuccess: () => fetchMoreReplies(),
    onError: (error: Error) => alert(error.message),
  });

  useWatchNewReply(id, (reply) => {
    const lastReply = last(replies);
    if (!lastReply || reply.createdAt > lastReply.createdAt) {
      fetchMoreReplies();
      clearUnreadCount(id);
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
                <ReplyInput onCommit={reply} disabled={committing} />
              ))}
          </QueryWrapper>
        </QueryWrapper>
      </PageContent>
    </>
  );
}
