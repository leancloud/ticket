import { ComponentPropsWithoutRef, memo, useMemo } from 'react';
import { BsPersonPlus } from 'react-icons/bs';
import cx from 'classnames';
import moment from 'moment';

import { TicketSchema } from '@/api/ticket';
import { Checkbox } from '@/components/antd';
import Status from '../TicketStatus';
import style from './index.module.css';
import { CategorySchema, useCategories } from 'api/category';

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

export function CategoryPath({ path, ...props }: CategoryPathProps) {
  return (
    <span
      {...props}
      className={cx(
        style.categoryPath,
        'p-1 border rounded border-[#6f7c87]',
        props.className
      )}
    >
      {path.join(' / ')}
    </span>
  );
}

function makeCategoryPathGetter(categories: CategorySchema[]) {
  const paths: Record<string, string[]> = {};
  const get = (id: string): string[] => {
    const cached = paths[id];
    if (cached) {
      return cached;
    }

    const category = categories.find((c) => c.id === id);
    if (!category) {
      return [];
    }

    if (category.parentId) {
      const path = [category.name, ...get(category.parentId)];
      paths[id] = path;
      return path;
    } else {
      const path = [category.name];
      paths[id] = path;
      return path;
    }
  };
  return get;
}

export function useGetCategoryPath() {
  const { data: categories } = useCategories();
  return useMemo(() => makeCategoryPathGetter(categories ?? []), [categories]);
}

export interface TicketListProps {
  tickets: TicketSchema[];
  checkedIds: string[];
  onChangeChecked: (id: string, checked: boolean) => void;
}

export const TicketList = memo(({ tickets, checkedIds, onChangeChecked }: TicketListProps) => {
  const checkedIdSet = useMemo(() => new Set(checkedIds), [checkedIds]);
  const getCategoryPath = useGetCategoryPath();

  return (
    <>
      {tickets.map((ticket) => {
        const isClosed = ticket.status >= 250;
        const createdAtFromNow = moment(ticket.createdAt).fromNow();
        const updatedAtFromNow = moment(ticket.updatedAt).fromNow();

        return (
          <div
            key={ticket.id}
            className={cx(
              style.ticket,
              'flex shrink-0 min-w-[460px] h-[102px] bg-white rounded-sm shadow cursor-default',
              {
                [style.closed]: isClosed,
              }
            )}
          >
            <div className="flex shrink-0 items-center p-4">
              <Checkbox
                checked={checkedIdSet.has(ticket.id)}
                onChange={(e) => onChangeChecked(ticket.id, e.target.checked)}
              />
            </div>

            <div className="grid grid-cols-4 grow">
              <div className="col-span-3 flex flex-col justify-center items-start py-4 overflow-hidden">
                <div>
                  <Status status={ticket.status} />
                  <CategoryPath className="ml-1" path={getCategoryPath(ticket.categoryId)} />
                </div>
                <a
                  className="flex mt-1.5 font-semibold max-w-full"
                  title={ticket.title}
                  href={`/tickets/${ticket.nid}`}
                >
                  <span className="shrink truncate">{ticket.title}</span>
                  <span className={`${style.nid} shrink-0 ml-1 text-[#6f7c87]`}>#{ticket.nid}</span>
                </a>
                <div className="flex items-center mt-1">
                  <Name>{ticket.author.nickname}</Name>
                  <div
                    className={`${style.time} text-[#6f7c87] whitespace-nowrap`}
                    title={ticket.createdAt}
                  >
                    创建于 {createdAtFromNow}
                  </div>
                  {updatedAtFromNow !== createdAtFromNow && (
                    <div
                      className={`${style.time} text-[#6f7c87] whitespace-nowrap`}
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
      })}
    </>
  );
});
