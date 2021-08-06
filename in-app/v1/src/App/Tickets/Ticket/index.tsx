import {
  ChangeEventHandler,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation, useQuery } from 'react-query';
import { useRouteMatch } from 'react-router-dom';
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

export function TicketStatus({ status }: { status: number }) {
  const { t } = useTranslation();
  return <span className={cx(styles.status, STATUS_CLASS[status])}>{t(STATUS_TEXT[status])}</span>;
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
    <button className={className} onClick={() => $input.current.click()}>
      <input className="hidden" type="file" ref={$input} onChange={handleUpload} />
      <ClipIcon className="text-tapBlue" />
    </button>
  );
}

interface ReplyData {
  content: string;
  file_ids: string[];
}

interface ReplyInputProps {
  onCommit: (data: ReplyData) => void | Promise<void>;
}

function ReplyInput({ onCommit }: ReplyInputProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const $textarea = useRef<HTMLTextAreaElement>(null);
  const { files, isUploading, upload, remove, removeAll } = useUpload();
  const submitable = useMemo(() => {
    return !isUploading && (content.trim() || files.length);
  }, [isUploading, content]);

  const $height = useRef(0);
  const handleChangeContent = (nextContent: string) => {
    setContent(nextContent);
    if (!$textarea.current) {
      return;
    }
    if (nextContent.length < content.length) {
      $textarea.current.style.height = 'auto';
    }
    const height = $textarea.current.scrollHeight;
    $textarea.current.style.height = height + 'px';
    $height.current = height;
  };
  useEffect(() => {
    if (editing && $textarea.current) {
      $textarea.current.style.height = $height.current ? $height.current + 'px' : 'auto';
    }
  }, [editing]);
  // TODO: 上传文件后滚动到底部

  const handleCommit = async () => {
    try {
      await onCommit({
        content: content.trim(),
        file_ids: files.map((file) => file.id!),
      });
      setContent('');
      $height.current = 0;
      setEditing(false);
      removeAll();
    } catch {}
  };

  return (
    <>
      <div
        className={cx('border-t border-gray-100 bg-[#FAFAFA] pb-[env(safe-area-inset-bottom)]', {
          invisible: editing,
        })}
      >
        <div className="flex items-center p-2 text-sm">
          <input
            className="leading-[16px] border rounded-full placeholder-[#BFBFBF] flex-grow p-2"
            placeholder={t('reply.input_content_hint')}
            value={content}
            onChange={(e) => handleChangeContent(e.target.value)}
            onFocus={() => setEditing(true)}
          />
          <Button
            className="ml-2 leading-none w-16 h-8"
            disabled={!submitable}
            onClick={handleCommit}
          >
            {t('general.send')}
          </Button>
        </div>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)}>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black opacity-30" />

        <div className="fixed bottom-0 z-50 w-full">
          <div className="flex items-center border-t border-gray-100 bg-[#FAFAFA] p-2 text-sm">
            <div className="flex flex-grow bg-white border rounded-[17px] leading-none">
              <div className="flex-grow max-h-[calc(100vh-4rem)] min-h-[32px] p-2 overflow-y-auto rounded-[16px] leading-[0]">
                <textarea
                  ref={$textarea}
                  className="w-full h-4 leading-[16px] placeholder-gray-300"
                  autoFocus
                  placeholder={t('reply.input_content_hint')}
                  value={content}
                  onChange={(e) => handleChangeContent(e.target.value)}
                  rows={1}
                />

                {files.length > 0 && (
                  <FileItems className="mt-2" files={files} onDelete={(file) => remove(file.key)} />
                )}
              </div>

              <div className="flex flex-col-reverse">
                <MiniUploader className="mr-2 mb-[7px]" onUpload={(files) => upload(files[0])} />
              </div>
            </div>

            <Button
              className="ml-2 mt-auto mb-px leading-none w-16 h-8"
              disabled={!submitable}
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
  const {
    params: { id },
  } = useRouteMatch<{ id: string }>();
  const { t } = useTranslation();
  const result = useTicket(id);
  useClearUnreadCount(id, result.data?.unreadCount);
  const repliesResult = useReplies(id, {
    onSuccess: () => {
      if ($container.current) {
        $container.current.scrollTop = $container.current.scrollHeight;
      }
    },
  });
  const $container = useRef<HTMLDivElement>(null);

  const replies = useMemo<Reply[]>(() => {
    if (!repliesResult.data) {
      return [];
    }
    return repliesResult.data.pages.flat();
  }, [repliesResult.data]);

  const { mutateAsync: reply } = useMutation({
    mutationFn: (data: ReplyData) => commitReply(id, data),
    onSuccess: () => repliesResult.fetchNextPage(),
    onError: (error: Error) => alert(error.message),
  });

  if (!result.isLoading && !result.isError && !result.data) {
    // Ticket is not exists :badbad:
    return <>Ticket is not found</>;
  }

  return (
    <Page title={t('ticket.detail')} className="rounded-b-none mb-0 min-h-full">
      <QueryWrapper result={result}>
        {(ticket) => (
          <>
            <div className="flex-grow" ref={$container}>
              <TicketAttributes ticket={ticket} />
              <QueryWrapper result={repliesResult}>
                <Replies className="p-4" replies={replies} />
              </QueryWrapper>

              <div id="dummyNewestReply" />
            </div>

            <div className="sticky bottom-0 bg-white">
              {ticket.status < 200 ? (
                <ReplyInput onCommit={reply} />
              ) : ticket.evaluation ? (
                <Evaluated />
              ) : (
                <NewEvaluation ticketId={id} />
              )}
            </div>
          </>
        )}
      </QueryWrapper>
    </Page>
  );
}
