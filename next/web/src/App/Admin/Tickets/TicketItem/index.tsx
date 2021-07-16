import cx from 'classnames';
import moment from 'moment';

import { TicketStatus } from '../TicketStatus';

export interface TicketItemProps {
  title: string;
  nid: number;
  author: string;
  status: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function TicketItem({ title, nid, author, status, createdAt, updatedAt }: TicketItemProps) {
  const asai = status >= 250;

  return (
    <div className="flex-shrink-0 flex justify-between bg-white h-24 rounded shadow-sm border-b border-gray-300">
      <div className="h-full flex flex-col justify-center gap-1 items-start ml-4">
        <TicketStatus status={status} />
        <a
          href="/"
          className={cx('font-semibold', {
            'text-gray-800 hover:text-blue-800': !asai,
            'text-gray-400': asai,
          })}
        >
          <span>{title}</span>
          <span
            className={cx('ml-2', {
              'text-gray-600': !asai,
              'text-gray-300': asai,
            })}
          >
            #{nid}
          </span>
        </a>
        <div
          className={cx('text-sm', {
            'text-gray-400': !asai,
            'text-gray-300': asai,
          })}
        >
          {author} · 创建于 {moment(createdAt).fromNow()} · 更新于 {moment(updatedAt).fromNow()}
        </div>
      </div>
    </div>
  );
}
