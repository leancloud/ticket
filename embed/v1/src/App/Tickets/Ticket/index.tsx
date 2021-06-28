import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
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
import { Timeline } from './Timeline';
import { Evaluation } from './Evaluation';

export interface Ticket {
  id: string;
  title: string;
  content: string;
  status: number;
  created_at: string;
  updated_at: string;
}

function fetchTicket(id: string): Promise<Ticket> {
  const ticket: Ticket = {
    id,
    title: '我是标题',
    content: '我是描述'.repeat(20),
    status: 220,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return new Promise((resolve) => {
    setTimeout(() => resolve(ticket), 500);
  });
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

interface TicketDetailProps {
  ticket: Ticket;
}

function TicketDetail({ ticket }: TicketDetailProps) {
  const [expand, setExpand] = useState(false);

  return (
    <div className={`${styles.detail} px-4 pt-4 border-b border-gray-100 text-gray-500 text-xs`}>
      {expand && (
        <>
          <TicketAttribute expand title="编号">
            {ticket.id}
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
          <div className="flex flex-wrap">
            <FileItem name="c3p.avi" />
          </div>
        </TicketAttribute>
      )}
      <div className="p-2 text-center">
        <ExpandButton expand={expand} onClick={() => setExpand((v) => !v)} />
      </div>
    </div>
  );
}

function ReplyInput() {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const $textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const resize = () => {
      if (!$textarea.current) {
        return;
      }
      $textarea.current.style.height = 'auto';
      $textarea.current.style.height = $textarea.current.scrollHeight + 'px';
    };
    resize();
  }, [content]);

  if (editing) {
    return (
      <Dialog open onClose={() => setEditing(false)}>
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
                <button className="absolute bottom-2 right-2 w-5 h-5  text-tapBlue-600 transform rotate-45 scale-y-125">
                  <PaperClipIcon />
                </button>
                <div className="flex flex-wrap px-2">
                  <FileItem name="👀.txt" />
                </div>
              </div>
            </div>
            <div className="flex-none flex flex-col-reverse">
              <Button className="min-w-min">发送</Button>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }
  return (
    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
      <div className="flex">
        <Input
          className="rounded-full flex-grow mr-4"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setEditing(true)}
        />
        <Button className="min-w-min">发送</Button>
      </div>
    </div>
  );
}

export function Ticket() {
  const {
    params: { id },
  } = useRouteMatch<{ id: string }>();
  const result = useTicket(id);

  if (!result.isLoading && !result.isError && !result.data) {
    // Ticket is not exists :badbad:
    return <Redirect to="/home" />;
  }
  return (
    <Page title="问题详情">
      <QueryWrapper result={result}>
        {(ticket) => (
          <div className="flex flex-col h-full">
            <div className="flex-grow overflow-auto">
              <TicketDetail ticket={ticket} />
              <Timeline ticketId={ticket.id} />
              {ticket.status >= 200 && <Evaluation />}
            </div>
            {ticket.status < 200 && <ReplyInput />}
          </div>
        )}
      </QueryWrapper>
    </Page>
  );
}
