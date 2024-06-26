import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import _ from 'lodash';

import { useSearchTickets, useTickets, UseTicketsOptions } from '@/api/ticket';
import { usePage, usePageSize } from '@/utils/usePage';
import { Topbar, useOrderBy } from './Topbar';
import {
  FilterForm,
  Filters,
  LocalFiltersProvider,
  NormalFilters,
  useLocalFilters,
} from './Filter';
import { TicketTable } from './TicketTable';
import { TicketDetail } from './Ticket/TicketDetail';
import { StatsPanel } from './TicketStats';
import {
  TicketSwitchType,
  TicketSwitchTypeProvider,
  useTicketSwitchType,
} from './useTicketSwitchType';
import { useViewTickets } from '@/api/view';
import { useTicketTableColumn } from './hooks/useTicketTableColumns';

const DEFAULT_PAGE_SIZE = 20;

interface UseSmartFetchTicketsOptions extends UseTicketsOptions {
  filters: Filters;
  type: TicketSwitchType;
  queryOptions?: {
    keepPreviousData?: boolean;
  };
}

function useSmartSearchTickets({
  type,
  filters,
  queryOptions,
  ...options
}: UseSmartFetchTicketsOptions) {
  const isProcessableSearch = type === 'processable';
  const isRegularTicket = filters.type === 'normal' && !filters.keyword && !isProcessableSearch;
  const isFieldSearch = filters.type === 'field' && !isProcessableSearch;
  const isKeywordSearch = filters.type === 'normal' && !!filters.keyword && !isProcessableSearch;

  const useTicketResult = useTickets({
    filters: _.omit(filters, ['type', 'fieldId', 'fieldValue']),
    ...options,
    queryOptions: {
      ...queryOptions,
      enabled: isRegularTicket,
    },
  });

  const useSearchTicketsResult = useSearchTickets({
    filters: (isKeywordSearch
      ? _.omit(filters, ['type', 'fieldId', 'fieldValue'])
      : _.pick(filters, ['createdAt', 'fieldId', 'fieldValue'])) as NormalFilters,
    ...options,
    queryOptions: {
      ...queryOptions,
      enabled: isKeywordSearch || isFieldSearch,
    },
  });

  const useProcessableTicketsResult = useViewTickets('incoming', {
    ..._.pick(options, ['page', 'pageSize']),
    queryOptions: {
      ...queryOptions,
      enabled: isProcessableSearch,
    },
  });

  return {
    ...(isProcessableSearch
      ? useProcessableTicketsResult
      : isKeywordSearch || isFieldSearch
      ? useSearchTicketsResult
      : useTicketResult),
    mode: isProcessableSearch ? 'view' : isKeywordSearch || isFieldSearch ? 'search' : 'normal',
  };
}

function TicketListView() {
  const [page, { set: setPage }] = usePage();
  const [pageSize = DEFAULT_PAGE_SIZE, setPageSize] = usePageSize();
  const { orderKey, orderType } = useOrderBy();
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [localFilters, setLocalFilters] = useLocalFilters();
  const [type] = useTicketSwitchType();

  const { columns, setColumns, hasCustomField } = useTicketTableColumn();

  const { data: tickets, totalCount, isFetching, mode } = useSmartSearchTickets({
    page,
    pageSize,
    orderKey,
    orderType,
    filters: localFilters,
    type,
    include: hasCustomField ? ['fields'] : [],
    queryOptions: {
      keepPreviousData: true,
    },
  });

  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  useEffect(() => setCheckedIds([]), [tickets]);

  const handleCheckTicket = (id: string, checked: boolean) => {
    if (checked) {
      setCheckedIds((prev) => [...prev, id]);
    } else {
      setCheckedIds((prev) => prev.filter((_id) => _id !== id));
    }
  };

  const handleCheckAll = (checked: boolean) => {
    if (tickets) {
      if (checked) {
        setCheckedIds(tickets.map((t) => t.id));
      } else {
        setCheckedIds([]);
      }
    }
  };

  useEffect(() => {
    if (localFilters.type === 'normal' && localFilters.keyword) {
      setShowStatsPanel(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(localFilters as NormalFilters).keyword, localFilters.type]);

  const isAdvanceMode =
    !!(localFilters.type === 'normal' && localFilters.keyword) ||
    localFilters.type === 'field' ||
    type === 'processable';

  return (
    <div className="flex flex-col h-full">
      <Topbar
        className="shrink-0 z-10"
        showFilter={showFilterForm}
        onChangeShowFilter={setShowFilterForm}
        showStatsPanel={showStatsPanel}
        onChangeShowStatsPanel={setShowStatsPanel}
        page={page}
        pageSize={pageSize}
        onChangePage={setPage}
        onChangePageSize={setPageSize}
        count={tickets?.length}
        totalCount={totalCount}
        isLoading={isFetching}
        checkedTicketIds={checkedIds}
        onCheckedChange={handleCheckAll}
        ticketTable={{
          columns,
          onChangeColumns: setColumns,
        }}
        disableStats={!tickets?.length || isAdvanceMode}
        disableExport={!totalCount || isAdvanceMode}
        disableFieldsSelect={isAdvanceMode}
      />

      <div className="flex grow overflow-hidden">
        <div className="flex grow flex-col p-[10px] overflow-auto">
          {showStatsPanel && <StatsPanel />}
          <TicketTable
            loading={isFetching}
            tickets={tickets}
            checkedIds={checkedIds}
            onChangeChecked={handleCheckTicket}
            columns={mode === 'normal' ? columns : undefined}
          />
        </div>
        {showFilterForm && (
          <FilterForm className="shrink-0" filters={localFilters} onChange={setLocalFilters} />
        )}
      </div>
    </div>
  );
}

export default function TicketRoutes() {
  return (
    <Routes>
      <Route
        index
        element={
          <LocalFiltersProvider>
            <TicketSwitchTypeProvider>
              <TicketListView />
            </TicketSwitchTypeProvider>
          </LocalFiltersProvider>
        }
      />
      <Route path=":id" element={<TicketDetail />} />
    </Routes>
  );
}
