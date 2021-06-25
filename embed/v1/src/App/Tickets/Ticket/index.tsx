import { useQuery } from 'react-query';
import { Redirect, useRouteMatch } from 'react-router-dom';
import classNames from 'classnames';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid';

import { Page } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import styles from './index.module.css';
import { PropsWithChildren } from 'react';
import { useState } from 'react';
import { useCallback } from 'react';
import { FileItem } from 'components/FileItem';
import { Input } from 'components/Form';
import { Button } from 'components/Button';

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
    status: 50,
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
    <div className="px-4 pt-4 bg-gray-50 border-b border-gray-100 text-gray-500">
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
  return (
    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
      <div className="flex">
        <Input className="rounded-full flex-grow mr-4" />
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
            <div className="overflow-auto">
              <TicketDetail ticket={ticket} />
              <div className="" style={{ height: '1000px' }}>
                content
              </div>
            </div>
            <ReplyInput />
          </div>
        )}
      </QueryWrapper>
    </Page>
  );
}
