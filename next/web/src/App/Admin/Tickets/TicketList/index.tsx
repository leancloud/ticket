import { ComponentPropsWithoutRef, memo } from 'react';
import { BsPersonPlus } from 'react-icons/bs';
import cx from 'classnames';
import moment from 'moment';

import { TicketSchema } from '..';
import Status from './TicketStatus';
import styles from './index.module.css';

function Name({ children }: { children?: string }) {
  return (
    <div className="max-w-[86px] truncate" title={children}>
      {children ?? '--'}
    </div>
  );
}

interface CategoryPathProps extends ComponentPropsWithoutRef<'span'> {
  path: string[];
}

function CategoryPath({ path, ...props }: CategoryPathProps) {
  return (
    <span
      {...props}
      className={cx(
        styles.categoryPath,
        'text-sm px-1 border rounded border-[#6f7c87]',
        props.className
      )}
    >
      {path.join(' / ')}
    </span>
  );
}

export interface TicketItemProps {
  ticket: TicketSchema & { categoryPath?: string[] };
}

export const TicketItem = memo<TicketItemProps>(({ ticket }) => {
  const isClosed = ticket.status >= 250;
  const createdAtFromNow = moment(ticket.createdAt).fromNow();
  const updatedAtFromNow = moment(ticket.updatedAt).fromNow();

  return (
    <div
      className={cx(
        'grid grid-cols-4 flex-shrink-0 min-w-[460px] h-[102px] bg-white rounded-sm shadow cursor-default',
        styles.ticket,
        {
          [styles.closed]: isClosed,
        }
      )}
    >
      <div className="col-span-3 flex flex-col justify-center items-start p-4 overflow-hidden">
        <div>
          <Status status={ticket.status} />
          {ticket.categoryPath && <CategoryPath className="ml-1" path={ticket.categoryPath} />}
        </div>
        <a
          className="flex mt-1.5 font-semibold max-w-full"
          title={ticket.title}
          href={`/tickets/${ticket.nid}`}
        >
          <span className="flex-shrink truncate">{ticket.title}</span>
          <span className={`${styles.nid} flex-shrink-0 ml-1 text-[#6f7c87]`}>#{ticket.nid}</span>
        </a>
        <div className="flex items-center mt-1">
          <Name>{ticket.author.nickname}</Name>
          <div
            className={`${styles.time} text-[#6f7c87] whitespace-nowrap`}
            title={ticket.createdAt}
          >
            创建于 {createdAtFromNow}
          </div>
          {updatedAtFromNow !== createdAtFromNow && (
            <div
              className={`${styles.time} text-[#6f7c87] whitespace-nowrap`}
              title={ticket.updatedAt}
            >
              更新于 {updatedAtFromNow}
            </div>
          )}
        </div>
      </div>

      <div className="col-span-1 flex flex-col justify-center items-start p-4 overflow-hidden">
        <div className="flex items-center">
          <BsPersonPlus className="mr-1.5" />
          <Name>{ticket.group?.name}</Name>
          <div className="px-1.5">/</div>
          <Name>{ticket.assignee?.nickname}</Name>
        </div>
      </div>
    </div>
  );
});

export interface TicketListProps {
  tickets: TicketSchema[];
}

export const TicketList = memo<TicketListProps>(({ tickets }) => {
  return (
    <>
      {tickets.map((ticket) => (
        <TicketItem key={ticket.id} ticket={ticket} />
      ))}
    </>
  );
});
