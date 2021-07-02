import { ChangeEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { Redirect, useRouteMatch } from 'react-router-dom';
import classNames from 'classnames';
import { ChevronDownIcon, ChevronUpIcon, PaperClipIcon } from '@heroicons/react/solid';
import { Dialog } from '@headlessui/react';

import { Page } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { FileItem } from 'components/FileItem';
import { Input } from 'components/Form';
import { Button } from 'components/Button';
import styles from './index.module.css';
import { Replies, useReplies } from './Replies';
import { Evaluated, NewEvaluation } from './Evaluation';
import { http } from 'leancloud';
import { useUpload } from '../New/useUpload';
import { Reply, Ticket } from 'types';
import { usePreview } from 'utils/usePreview';

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
  50: '待处理',
  120: '待客服回复',
  160: '待用户处理',
  220: '已解决',
  250: '已解决',
  280: '已解决',
};

export function TicketStatus({ status }: { status: number }) {
  return (
    <span className={classNames(styles.status, STATUS_CLASS[status])}>
      {STATUS_TEXT[status] || '未知'}
    </span>
  );
}

type TicketAttributeProps = JSX.IntrinsicElements['div'] & {
  title: string;
  expand?: boolean;
};

function TicketAttribute({ title, expand, ...props }: TicketAttributeProps) {
  return (
    <div className={`flex ${expand ? 'mb-2' : 'mb-1'}`}>
      <div className="flex-shrink-0 w-20 text-gray-400">{title}</div>
      <div {...props} />
    </div>
  );
}

interface ExpandButtonProps {
  expand: boolean;
  onClick: () => void;
}

function ExpandButton({ expand, onClick }: ExpandButtonProps) {
  return (
    <button className="text-tapBlue-600" onClick={onClick}>
      {expand ? (
        <>
          收起
          <ChevronUpIcon className="w-5 h-5 inline-block" />
        </>
      ) : (
        <>
          展开
          <ChevronDownIcon className="w-5 h-5 inline-block" />
        </>
      )}
    </button>
  );
}

interface TicketAttributesProps {
  ticket: Ticket;
}

function TicketAttributes({ ticket }: TicketAttributesProps) {
  const [expand, setExpand] = useState(false);
  const { element: previewElement, preview } = usePreview();

  return (
    <div className={`${styles.detail} px-4 pt-4 border-b border-gray-100 text-gray-500 text-xs`}>
      {previewElement}
      {expand && (
        <>
          <TicketAttribute expand title="编号">
            #{ticket.nid}
          </TicketAttribute>
          <TicketAttribute expand title="状态">
            <TicketStatus status={ticket.status} />
          </TicketAttribute>
        </>
      )}
      <TicketAttribute expand={expand} className="truncate" title="标题">
        {ticket.title}
      </TicketAttribute>
      <TicketAttribute expand={expand} className={expand ? undefined : 'truncate'} title="描述">
        {ticket.content}
      </TicketAttribute>
      {expand && (
        <TicketAttribute expand title="附件">
          {ticket.files.length === 0 ? (
            '（无）'
          ) : (
            <div className="flex flex-wrap">
              {ticket.files.map((file) => (
                <FileItem
                  key={file.id}
                  name={file.name}
                  mime={file.mime}
                  url={file.url}
                  onClick={() => preview(file)}
                />
              ))}
            </div>
          )}
        </TicketAttribute>
      )}
      <div className="p-2 text-center">
        <ExpandButton expand={expand} onClick={() => setExpand((v) => !v)} />
      </div>
    </div>
  );
}

interface MiniUploaderProps {
  className?: string;
  onUpload: (files: FileList) => void;
}

function MiniUploader({ className, onUpload }: MiniUploaderProps) {
  const $fileInput = useRef<HTMLInputElement>(null);
  const handleUpload = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      const files = e.target.files;
      if (files?.length) {
        onUpload(files);
        $fileInput.current!.value = '';
      }
    },
    [onUpload]
  );

  return (
    <button
      className={classNames(className, 'w-5 h-5 text-tapBlue-600 transform rotate-45 scale-y-125')}
      onClick={() => $fileInput.current?.click()}
    >
      <input className="hidden" type="file" ref={$fileInput} onChange={handleUpload} />
      <PaperClipIcon />
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
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const $textarea = useRef<HTMLTextAreaElement>(null);
  const { files, isUploading, upload, remove, removeAll } = useUpload();
  const canUpload = useMemo(() => {
    return !isUploading && (content.trim() || files.length);
  }, [isUploading, content]);

  useEffect(() => {
    if ($textarea.current) {
      $textarea.current.style.height = 'auto';
      $textarea.current.style.height = $textarea.current.scrollHeight + 'px';
    }
  }, [content]);

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
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <div className="flex">
          <Input
            className="rounded-full flex-grow mr-4"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setEditing(true)}
          />
          <Button className="min-w-min" disabled={!canUpload} onClick={handleCommit}>
            发送
          </Button>
        </div>
      </div>
      <Dialog open={editing} onClose={() => setEditing(false)}>
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 fixed bottom-0 w-full">
          <div className="flex">
            <div className="w-full mr-4 relative">
              <div className="flex-grow rounded-2xl border bg-white overflow-auto max-h-32 pr-5">
                <textarea
                  ref={$textarea}
                  className="w-full p-2 box-border"
                  autoFocus
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <MiniUploader
                  className="absolute bottom-2 right-2"
                  onUpload={(files) => upload(files[0])}
                />
                <div className="flex flex-wrap px-2">
                  {files.map(({ key, name, mime, url, progress }) => (
                    <FileItem
                      key={key}
                      name={name}
                      mime={mime}
                      url={url}
                      progress={progress}
                      onDelete={() => remove(key as number)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-none flex flex-col-reverse">
              <Button className="min-w-min" disabled={!canUpload} onClick={handleCommit}>
                发送
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}

async function commitReply(ticketId: string, data: ReplyData) {
  await http.post(`/api/1/tickets/${ticketId}/replies`, data);
}

export default function TicketDetail() {
  const {
    params: { id },
  } = useRouteMatch<{ id: string }>();
  const result = useTicket(id);
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
    return <Redirect to="/home" />;
  }
  return (
    <Page title="问题详情">
      <QueryWrapper result={result}>
        {(ticket) => (
          <div className="flex flex-col h-full">
            <div className="flex-grow overflow-auto" ref={$container}>
              <TicketAttributes ticket={ticket} />
              <QueryWrapper result={repliesResult}>
                <Replies replies={replies} />
              </QueryWrapper>
              {ticket.status >= 200 &&
                (ticket.evaluation ? <Evaluated /> : <NewEvaluation ticketId={id} />)}
            </div>
            {ticket.status < 200 && <ReplyInput onCommit={reply} />}
          </div>
        )}
      </QueryWrapper>
    </Page>
  );
}
