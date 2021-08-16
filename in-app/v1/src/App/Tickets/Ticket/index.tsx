import {
  ChangeEvent,
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation, useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid';
import { Dialog } from '@headlessui/react';

import { Page } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { FileItems } from 'components/FileItem';
import { Button } from 'components/Button';
import ClipIcon from 'icons/Clip';
import styles from './index.module.css';
import { Replies, useReplies } from './Replies';
import { Evaluated, NewEvaluation } from './Evaluation';
import { http } from 'leancloud';
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

export function useTicket(id: string) {
  return useQuery({
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
    <div className="bg-[#FAFAFA] border-b border-gray-100 text-sm transition-all px-4 pt-4">
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
      className={className}
      onClick={() => $input.current.click()}
      onTouchStart={(e) => e.preventDefault()}
      onTouchEnd={(e) => {
        e.preventDefault();
        $input.current.click();
      }}
    >
      <input className="hidden" type="file" ref={$input} onChange={handleUpload} />
      <ClipIcon className="text-tapBlue" />
    </button>
  );
}

function AutosizedTextarea(props: ComponentPropsWithoutRef<'textarea'>) {
  const $textarea = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const textarea = $textarea.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, []);

  useEffect(() => {
    const textarea = $textarea.current!;
    let ob: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ob = new ResizeObserver(resize);
      ob.observe(textarea);
    }
    textarea.addEventListener('input', resize);

    return () => {
      ob?.disconnect();
      textarea.removeEventListener('input', resize);
    };
  }, []);

  return <textarea {...props} ref={$textarea} />;
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
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const { files, isUploading, upload, remove, removeAll } = useUpload();
  const submitable = useMemo(() => {
    return !isUploading && (content.trim() || files.length);
  }, [files, isUploading, content]);

  const handleChangeContent = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setContent(e.target.value);
    },
    []
  );

  // TODO: 上传文件后滚动到底部

  const handleCommit = async () => {
    try {
      await onCommit({
        content: content.trim(),
        file_ids: files.map((file) => file.id!),
      });
      setContent('');
      setEditing(false);
      removeAll();
    } catch {}
  };

  return (
    <>
      <div
        className={cx(
          'flex border-t border-gray-100 bg-[#FAFAFA] px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]',
          {
            invisible: editing,
          }
        )}
      >
        <input
          className="flex-grow h-8 px-2 border rounded-full placeholder-[#BFBFBF] text-sm"
          placeholder={t('reply.input_content_hint')}
          value={content}
          onChange={handleChangeContent}
          onFocus={() => setEditing(true)}
        />
        <Button
          className="flex-shrink-0 ml-2 w-16 leading-8 text-[13px]"
          disabled={!submitable || disabled}
          onClick={handleCommit}
        >
          {t('general.send')}
        </Button>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)}>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black opacity-30" />

        <div className="fixed left-0 right-0 bottom-0 z-50 bg-[#FAFAFA] border-t border-gray-100 px-3 pt-2 pl-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(8px,env(safe-area-inset-bottom))]">
          <div className="relative flex items-end">
            <div className="bg-white flex-grow leading-[0] rounded-[16px] border pl-3 pr-[34px] max-h-[calc(100vh-13px)] overflow-y-auto">
              <AutosizedTextarea
                className="w-full text-sm leading-[16px] my-[7px] placeholder-[#BFBFBF]"
                autoFocus
                placeholder={t('reply.input_content_hint')}
                value={content}
                onChange={handleChangeContent}
                rows={1}
              />
              {files.length > 0 && (
                <FileItems
                  files={files}
                  previewable={false}
                  onDelete={(file) => remove(file.key)}
                />
              )}
            </div>

            <MiniUploader
              className="absolute right-[82px] bottom-1.5"
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
      </Dialog>
    </>
  );
}

async function commitReply(ticketId: string, data: ReplyData) {
  await http.post(`/api/1/tickets/${ticketId}/replies`, data);
}

function useClearUnreadCount(ticketId: string, enabled?: any) {
  useEffect(() => {
    if (enabled) {
      http.patch(`/api/1/tickets/${ticketId}`, { unread_count: 0 });
    }
  }, [ticketId, enabled]);
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const result = useTicket(id);
  const { data: ticket } = result;

  useClearUnreadCount(id, ticket?.unreadCount);

  const ticketIsClosed = useMemo(() => {
    return ticket !== undefined && ticket.status >= 200;
  }, [ticket]);

  const repliesResult = useReplies(id);
  const { data: replyPages } = repliesResult;

  const replies = useMemo<Reply[]>(() => {
    if (!replyPages) {
      return [];
    }
    return replyPages.pages.flat();
  }, [replyPages]);

  const { mutateAsync: reply, isLoading: committing } = useMutation({
    mutationFn: (data: ReplyData) => commitReply(id, data),
    onSuccess: () => repliesResult.fetchNextPage(),
    onError: (error: Error) => alert(error.message),
  });

  return (
    <Page>
      <Page.Header>{t('ticket.detail')}</Page.Header>

      <Page.Content id="shit">
        <QueryWrapper result={result}>
          <div className="flex-grow">
            <TicketAttributes ticket={ticket!} />
            <QueryWrapper result={repliesResult}>
              <Replies className="px-4 pt-4" replies={replies} />
            </QueryWrapper>
          </div>
        </QueryWrapper>
      </Page.Content>

      <Page.Footer
        containerProps={{
          className: ticketIsClosed ? undefined : 'sticky bottom-0',
          style: ticketIsClosed ? undefined : { paddingBottom: 0 },
        }}
      >
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
      </Page.Footer>
    </Page>
  );
}
