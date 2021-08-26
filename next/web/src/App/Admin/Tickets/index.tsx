import { useMemo, useState } from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import { keyBy, partition } from 'lodash';

import { CategorySchema, useCategories } from 'api/category';
import { TicketParams, TicketSchema, useTickets } from 'api/ticket';
import { usePage } from 'utils/usePage';
import { Topbar, useOrderBy } from './Topbar';
import { Filter, useTicketSearchParams } from './Filter';
import { TicketList } from './TicketList';
import { getTimeRange } from './Filter/CreatedAtSelect';

const pageSize = 20;

function makeCategoryPathGetter(categories: CategorySchema[]) {
  const map: Record<string, string[]> = {};
  const categoryById = keyBy(categories, (c) => c.id);
  const getPath = (id: string): string[] => {
    if (map[id]) {
      return map[id];
    }
    let path: string[] = [];
    const category = categoryById[id];
    if (category) {
      if (category.parentId) {
        path = getPath(category.parentId).concat(category.name);
      } else {
        path = [category.name];
      }
    }
    map[id] = path;
    return path;
  };
  return getPath;
}

function getAllSubCategoryIds(categories: CategorySchema[], id: string): string[] {
  const result: string[] = [];
  const parentIds = [id];
  while (parentIds.length) {
    const parentId = parentIds.shift()!;
    const [hited, rest] = partition(categories, (c) => c.parentId === parentId);
    result.push(...hited.map((c) => c.id));
    categories = rest;
  }
  return result;
}

interface UseTicketParamsOptions {
  categories?: CategorySchema[];
}

function useTicketParams({ categories }: UseTicketParamsOptions): TicketParams {
  const [params] = useTicketSearchParams();

  const categoryId = useMemo(() => {
    if (params.categoryId && categories) {
      return [params.categoryId, ...getAllSubCategoryIds(categories, params.categoryId)];
    }
  }, [params.categoryId, categories]);

  return {
    assigneeId: params.assigneeId,
    groupId: params.groupId,
    createdAt: params.createdAt ? getTimeRange(params.createdAt) : undefined,
    categoryId,
    status: params.status,
  };
}

function TicketsPage() {
  const [showFilter, setShowFilter] = useState(false);
  const { data: categories } = useCategories();
  const params = useTicketParams({ categories });
  const [page = 1] = usePage();
  const { orderKey, orderType } = useOrderBy();
  const { data, isLoading, isFetching } = useTickets({
    ...params,
    pageSize,
    page,
    orderKey,
    orderType,
    queryOptions: {
      keepPreviousData: true,
    },
  });

  const getCategoryPath = useMemo(() => makeCategoryPathGetter(categories ?? []), [categories]);

  const tickets = useMemo<(TicketSchema & { categoryPath: string[] })[]>(() => {
    if (!data) {
      return [];
    }
    return data.tickets.map((ticket) => ({
      ...ticket,
      categoryPath: getCategoryPath(ticket.categoryId),
    }));
  }, [data, getCategoryPath]);

  return (
    <div className="flex flex-col h-full">
      <Topbar
        className="flex-shrink-0"
        showFilter={showFilter}
        onChangeShowFilter={setShowFilter}
        pagination={{
          pageSize,
          count: data?.tickets.length ?? 0,
          totalCount: data?.totalCount ?? 0,
          isLoading: isLoading || isFetching,
        }}
      />
      <div className="flex flex-grow overflow-hidden">
        <div className="flex flex-grow flex-col bg-[#ebeff3] p-[10px] gap-2 overflow-auto">
          {isLoading ? (
            'Loading...'
          ) : tickets.length > 0 ? (
            <TicketList tickets={tickets} />
          ) : (
            'No data'
          )}
        </div>
        {showFilter && <Filter className="flex-shrink-0" />}
      </div>
    </div>
  );
}

export default function TicketRoutes() {
  const { path } = useRouteMatch();
  return (
    <Switch>
      <Route path={path}>
        <TicketsPage />
      </Route>
    </Switch>
  );
}
