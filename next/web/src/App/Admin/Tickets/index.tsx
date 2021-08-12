import { ComponentPropsWithoutRef, useCallback, useMemo, useState } from 'react';
import { Switch, Route, useRouteMatch, Link } from 'react-router-dom';
import { BsLayoutSidebarReverse } from 'react-icons/bs';
import { HiCheck, HiMenuAlt2, HiX } from 'react-icons/hi';
import cx from 'classnames';

import {
  CategoryTreeNode,
  FetchTicketsOptions,
  TicketItem,
  useCategoryTree,
  useTickets,
  UseTicketsOptions,
} from 'api';
import { usePage } from 'utils/usePage';
import { Button } from 'components/Button';
import { OrderDropdown, Pagination, useOrderBy } from './Topbar';
import { TicketItemComponent } from './TicketItem';
import { FiltersData, FiltersPanel, getTimeRange, useFiltersFromQueryParams } from './Filter';

const pageSize = 20;

function findCategory(tree: CategoryTreeNode[], id: string): CategoryTreeNode | undefined {
  const queue = [...tree];
  while (queue.length) {
    const front = queue.shift()!;
    if (front.id === id) {
      return front;
    }
    if (front.children) {
      queue.push(...front.children);
    }
  }
}

function getSubCategories(category: CategoryTreeNode): CategoryTreeNode[] {
  const categories: CategoryTreeNode[] = [];
  const queue = [category];
  while (queue.length) {
    const front = queue.shift()!;
    categories.push(front);
    if (front.children) {
      categories.push(...front.children);
      queue.push(...front.children);
    }
  }
  return categories;
}

function useTicketParam(filters: FiltersData) {
  return useMemo(() => {
    const params: FetchTicketsOptions['params'] = {};
    if (filters.assigneeIds?.length) {
      params.assigneeId = filters.assigneeIds.join(',');
    }
    if (filters.groupIds?.length) {
      params.groupId = filters.groupIds.join(',');
    }
    if (filters.createdAt) {
      const range = getTimeRange(filters.createdAt);
      if (range) {
        params.createdAt = `${range[0]?.toISOString() ?? '*'}..${range[1]?.toISOString() ?? '*'}`;
      }
    }
    if (filters.categoryId) {
      params.categoryId = filters.categoryId;
    }
    if (filters.status?.length) {
      params.status = filters.status.join(',');
    }
    return params;
  }, [filters]);
}

interface TicketListProps extends ComponentPropsWithoutRef<'div'> {
  tickets: TicketItem[];
}

function TicketList({ tickets, ...props }: TicketListProps) {
  return (
    <div
      {...props}
      className={cx('h-full p-3 flex-grow flex flex-col gap-2 overflow-y-auto', props.className)}
    >
      {tickets.length ? (
        tickets.map((ticket) => <TicketItemComponent key={ticket.id} ticket={ticket} />)
      ) : (
        <div className="text-center">
          <h1 className="text-2xl font-medium">此处无工单！</h1>
          <p className="p-2 text-gray-500">您在此视图中没有任何工单。</p>
          <Link className="text-primary font-bold" to="all-tickets">
            查看所有工单
          </Link>
        </div>
      )}
    </div>
  );
}

export function TopbarFilter() {
  return (
    <div className="flex items-center gap-4 text-[#183247]">
      <button className="p-1 rounded transition-colors hover:bg-gray-200">
        <HiMenuAlt2 className="w-6 h-6" />
      </button>
      <div className="font-bold">未命名</div>
      <button>
        <HiCheck className="w-6 h-6" />
      </button>
      <button>
        <HiX className="w-6 h-6" />
      </button>
    </div>
  );
}

function useTicketsByRootCategory({
  rootCategoryId,
  ...options
}: UseTicketsOptions & { rootCategoryId?: string }) {
  const { data: categoryTree, isLoading: isLoadingCategoryTree } = useCategoryTree({
    enabled: !!rootCategoryId,
  });

  const categoryId = useMemo(() => {
    if (categoryTree && rootCategoryId) {
      const category = findCategory(categoryTree, rootCategoryId);
      if (category) {
        return getSubCategories(category)
          .map((c) => c.id)
          .join(',');
      }
    }
    return undefined;
  }, [categoryTree, rootCategoryId]);

  const result = useTickets({
    ...options,
    queryOptions: {
      ...options.queryOptions,
      enabled: !isLoadingCategoryTree && options.queryOptions?.enabled,
    },
    params: { ...options.params, categoryId },
  });

  return { ...result, isLoading: result.isLoading ?? isLoadingCategoryTree };
}

function TicketsComponent() {
  const [filterShow, setFilterShow] = useState(false);
  const { orderKey, orderType } = useOrderBy();
  const [tmpFilters, setTmpFilters] = useFiltersFromQueryParams();
  const { categoryId, ...ticketsParams } = useTicketParam(tmpFilters);
  console.log(categoryId);
  const [page] = usePage();
  const [starts, setStarts] = useState(0);
  const [ends, setEnds] = useState(0);
  const { data: tickets, totalCount, isFetching } = useTicketsByRootCategory({
    page,
    pageSize,
    orderKey,
    orderType,
    rootCategoryId: categoryId as string,
    params: ticketsParams,
    queryOptions: {
      keepPreviousData: true,
      onSuccess: useCallback(
        ({ tickets }) => {
          const index = (page - 1) * pageSize;
          setStarts(index + 1);
          setEnds(index + tickets.length);
        },
        [page]
      ),
    },
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 bg-gray-50 h-14 flex items-center px-4 border-b border-gray-200">
        <div className="flex-grow">
          <OrderDropdown />
        </div>
        <div className="flex items-center gap-2">
          <Pagination starts={starts} ends={ends} totalCount={totalCount} isLoading={isFetching} />
          <Button active={filterShow} onClick={() => setFilterShow(!filterShow)}>
            <BsLayoutSidebarReverse className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 flex-grow flex overflow-hidden">
        <TicketList tickets={tickets ?? []} />
        {filterShow && <FiltersPanel filters={tmpFilters} onChange={setTmpFilters} />}
      </div>
    </div>
  );
}

export default function Tickets() {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route path={path}>
        <TicketsComponent />
      </Route>
    </Switch>
  );
}
