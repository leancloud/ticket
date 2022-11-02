import { ComponentPropsWithoutRef, useMemo } from 'react';
import { BsPersonPlus } from 'react-icons/bs';
import cx from 'classnames';
import moment from 'moment';
import { keyBy, uniq } from 'lodash-es';

import { CategorySchema, useCategories } from '@/api/category';
import { useCustomerServices } from '@/api/customer-service';
import { useGroups } from '@/api/group';
import { TicketSchema } from '@/api/ticket';
import { useUsers } from '@/api/user';
import { Checkbox } from '@/components/antd';
import { LoadingCover } from '@/components/common';
import { TicketStatus } from '../../components/TicketStatus';
import style from './index.module.css';

function Name({ children, loading }: { children: string; loading?: boolean }) {
  return (
    <div className="max-w-[86px] truncate" title={children}>
      {loading ? 'Loading...' : children}
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
      className={cx(style.categoryPath, 'p-1 border rounded border-[#6f7c87]', props.className)}
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
      const path = [...get(category.parentId), category.name];
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
  loading?: boolean;
  tickets?: TicketSchema[];
  checkedIds: string[];
  onChangeChecked: (id: string, checked: boolean) => void;
}

export function TicketList({ loading, tickets, checkedIds, onChangeChecked }: TicketListProps) {
  const checkedIdSet = useMemo(() => new Set(checkedIds), [checkedIds]);

  const userIds = useMemo(() => (tickets ? uniq(tickets.map((t) => t.authorId)) : []), [tickets]);
  const { data: users, isLoading: loadingUsers } = useUsers({
    id: userIds,
    queryOptions: {
      enabled: userIds.length > 0,
      staleTime: 1000 * 60,
    },
  });
  const userById = useMemo(() => keyBy(users, 'id'), [users]);

  const getCategoryPath = useGetCategoryPath();

  const { data: groups, isLoading: loadingGroups } = useGroups();
  const groupById = useMemo(() => keyBy(groups, 'id'), [groups]);

  const { data: assignees, isLoading: loadingAssignees } = useCustomerServices();
  const assigneeById = useMemo(() => keyBy(assignees, 'id'), [assignees]);

  return (
    <div
      className={cx('flex grow flex-col gap-2 relative', {
        'overflow-hidden': loading,
      })}
    >
      {loading && <LoadingCover />}
      {tickets?.map((ticket) => {
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
                  <TicketStatus status={ticket.status} />
                  <CategoryPath
                    className="ml-1 text-sm"
                    path={getCategoryPath(ticket.categoryId)}
                  />
                </div>
                <a
                  className="flex mt-1.5 font-bold max-w-full"
                  title={ticket.title}
                  href={`/tickets/${ticket.nid}`}
                >
                  <span className="shrink truncate">{ticket.title}</span>
                  <span className={`${style.nid} shrink-0 ml-1 text-[#6f7c87]`}>#{ticket.nid}</span>
                </a>
                <div className="flex items-center mt-1">
                  <Name loading={loadingUsers}>{userById[ticket.authorId]?.nickname ?? '--'}</Name>
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
                  <Name loading={loadingGroups}>
                    {ticket.groupId ? groupById[ticket.groupId]?.name ?? 'unknown' : '--'}
                  </Name>
                  <div className="px-1.5">/</div>
                  <Name loading={loadingAssignees}>
                    {ticket.assigneeId
                      ? assigneeById[ticket.assigneeId]?.nickname ?? 'unknown'
                      : '--'}
                  </Name>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
