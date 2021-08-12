import { BsPersonPlus } from 'react-icons/bs';
import cx from 'classnames';
import moment from 'moment';

import { TicketItem } from 'api';
import Status from '../Status';

function CategoryPath({ path }: { path: { name: string }[] }) {
  return (
    <span className="text-xs px-1 py-0.5 border rounded border-gray-500 text-gray-500">
      {path.map((c) => c.name).join(' / ')}
    </span>
  );
}

export interface TicketItemComponentProps {
  ticket: TicketItem;
}

export function TicketItemComponent({ ticket }: TicketItemComponentProps) {
  const asai = ticket.status >= 250;

  return (
    <div className="flex-shrink-0 grid grid-cols-4 bg-white h-24 rounded shadow-sm border-b border-gray-300 text-[#183247]">
      <div className="h-full col-span-3 flex flex-col justify-center gap-1 items-start ml-4">
        <span>
          <Status status={ticket.status} /> <CategoryPath path={[{ name: 'todo' }]} />
        </span>
        <a
          href={`/tickets/${ticket.nid}`}
          className={cx('font-semibold', {
            'text-gray-800 hover:text-blue-800': !asai,
            'text-gray-400': asai,
          })}
        >
          <span>{ticket.title}</span>
          <span
            className={cx('ml-2', {
              'text-gray-600': !asai,
              'text-gray-300': asai,
            })}
          >
            #{ticket.nid}
          </span>
        </a>
        <div
          className={cx('text-sm', {
            'text-gray-400': !asai,
            'text-gray-300': asai,
          })}
        >
          {ticket.author.nickname} · 创建于 {moment(ticket.createdAt).fromNow()} · 更新于{' '}
          {moment(ticket.updatedAt).fromNow()}
        </div>
      </div>
      <div className="flex flex-col justify-center gap-1 items-start text-sm">
        <div>
          <BsPersonPlus className="inline-block" />
          <span className="ml-2">
            {ticket.group?.name ?? '--'} / {ticket.assignee?.nickname ?? '--'}
          </span>
        </div>
      </div>
    </div>
  );
}
