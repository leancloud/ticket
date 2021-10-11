import { ComponentPropsWithoutRef, memo, useMemo } from 'react';
import { BsPersonPlus } from 'react-icons/bs';
import cx from 'classnames';
import moment from 'moment';
import { keyBy } from 'lodash-es';

import { TicketSchema } from 'api/ticket';
import { CategorySchema, useCategories } from 'api/category';
import { Checkbox } from 'components/Form/Checkbox';
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
  ticket: TicketSchema;
  categoryPath?: string[];
  checked?: boolean;
  onCheckedChange?: (ticket: TicketSchema, checked: boolean) => void;
}

export const TicketItem = memo<TicketItemProps>(
  ({ ticket, categoryPath, checked, onCheckedChange }) => {
    const isClosed = ticket.status >= 250;
    const createdAtFromNow = moment(ticket.createdAt).fromNow();
    const updatedAtFromNow = moment(ticket.updatedAt).fromNow();

    return (
      <div
        className={cx(
          'flex flex-shrink-0 min-w-[460px] h-[102px] bg-white rounded-sm shadow cursor-default',
          styles.ticket,
          {
            [styles.closed]: isClosed,
          }
        )}
      >
        <div className="flex flex-shrink-0 items-center p-4">
          <Checkbox
            checked={checked}
            onChange={(e) => onCheckedChange?.(ticket, e.target.checked)}
          />
        </div>

        <div className="grid grid-cols-4 flex-grow">
          <div className="col-span-3 flex flex-col justify-center items-start py-4 overflow-hidden">
            <div>
              <Status status={ticket.status} />
              {categoryPath && <CategoryPath className="ml-1" path={categoryPath} />}
            </div>
            <a
              className="flex mt-1.5 font-semibold max-w-full"
              title={ticket.title}
              href={`/tickets/${ticket.nid}`}
            >
              <span className="flex-shrink truncate">{ticket.title}</span>
              <span className={`${styles.nid} flex-shrink-0 ml-1 text-[#6f7c87]`}>
                #{ticket.nid}
              </span>
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
      </div>
    );
  }
);

function makeCategoryPathGetter(categories: CategorySchema[]) {
  const pathMap: Record<string, string[]> = {};
  const categoryMap = keyBy(categories, (c) => c.id);
  const getPath = (id: string): string[] => {
    if (pathMap[id]) {
      return pathMap[id];
    }
    let path: string[] = [];
    const category = categoryMap[id];
    if (category) {
      if (category.parentId) {
        path = getPath(category.parentId).concat(category.name);
      } else {
        path = [category.name];
      }
    }
    pathMap[id] = path;
    return path;
  };
  return getPath;
}

export interface TicketListProps {
  tickets: TicketSchema[];
  checkedIds?: string[];
  onCheckedIdsChange?: (ids: string[]) => void;
}

export function TicketList({ tickets, checkedIds, onCheckedIdsChange }: TicketListProps) {
  const { data: categories } = useCategories();
  const getCategoryPath = useMemo(() => makeCategoryPathGetter(categories ?? []), [categories]);
  const checkedIdSet = useMemo(() => new Set(checkedIds), [checkedIds]);

  const handleCheckTicket = (ticket: TicketSchema, checked: boolean) => {
    if (onCheckedIdsChange) {
      const nextSet = new Set(checkedIdSet);
      if (checked) {
        nextSet.add(ticket.id);
      } else {
        nextSet.delete(ticket.id);
      }
      onCheckedIdsChange(Array.from(nextSet));
    }
  };

  return (
    <>
      {tickets.map((ticket) => (
        <TicketItem
          key={ticket.id}
          ticket={ticket}
          categoryPath={getCategoryPath(ticket.categoryId)}
          checked={checkedIdSet.has(ticket.id)}
          onCheckedChange={handleCheckTicket}
        />
      ))}
    </>
  );
}
