import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import {
  useSearchTicketCustomField,
  useSearchTickets,
  useTickets,
  UseTicketsOptions,
} from '@/api/ticket';
import { usePage, usePageSize } from '@/utils/usePage';
import { Topbar, useOrderBy } from './Topbar';
import {
  FieldFilters,
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
import _ from 'lodash';
import { decodeDateRange } from '@/utils/date-range';

const DEFAULT_PAGE_SIZE = 20;

interface UseSmartFetchTicketsOptions extends Omit<UseTicketsOptions, 'filters'> {
  filters: Filters;
  type: TicketSwitchType;
}

function useSmartSearchTickets({
  type,
  filters,
  queryOptions,
  ...options
}: UseSmartFetchTicketsOptions) {
  const isProcessableSearch = type === 'processable';
  const isRegularTicket =
    ((filters.type === 'normal' && !filters.keyword) ||
      (filters.type === 'field' && !!filters.optionValue)) &&
    !isProcessableSearch;
  const isFieldSearch = filters.type === 'field' && !filters.optionValue && !isProcessableSearch;
  const isKeywordSearch = filters.type === 'normal' && !!filters.keyword && !isProcessableSearch;

  const dateRange = filters.createdAt && decodeDateRange(filters.createdAt);

  const useTicketResult = useTickets({
    filters:
      filters.type === 'normal'
        ? _.omit(filters, ['type', 'fieldId', 'optionValue'])
        : {
            fieldName: (filters as FieldFilters).fieldId,
            fieldValue: (filters as FieldFilters).optionValue,
          },
    ...options,
    queryOptions: {
      ...queryOptions,
      enabled: isRegularTicket,
    },
  });

  const useSearchTicketsResult = useSearchTickets((filters as NormalFilters).keyword!, {
    filters: _.omit(filters, ['keyword', 'type', 'fieldId', 'optionValue']) as NormalFilters,
    ...options,
    queryOptions: {
      ...queryOptions,
      enabled: isKeywordSearch,
    },
  });

  const useProcessableTicketsResult = useViewTickets('incoming', {
    ..._.pick(options, ['page', 'pageSize']),
    count: true,
    queryOptions: {
      ...queryOptions,
      enabled: isProcessableSearch,
    },
  });

  const { fieldId, textValue } = filters as FieldFilters;

  const useFieldSearchResult = useSearchTicketCustomField(
    `values.field:${fieldId ? encodeURIComponent(fieldId) : '*'} AND values.value:${
      textValue ? encodeURIComponent(textValue) : '*'
    }${
      dateRange
        ? ` AND createdAt:[${dateRange.from ? `"${dateRange.from.toISOString()}"` : '*'} TO ${
            dateRange.to ? `"${dateRange.to.toISOString()}"` : '*'
          }]`
        : ''
    }`,
    {
      enabled: isFieldSearch,
    }
  );

  return isProcessableSearch
    ? useProcessableTicketsResult
    : isKeywordSearch
    ? useSearchTicketsResult
    : isFieldSearch
    ? useFieldSearchResult
    : useTicketResult;
}

function TicketListView() {
  const [page, { set: setPage }] = usePage();
  const [pageSize = DEFAULT_PAGE_SIZE, setPageSize] = usePageSize();
  const { orderKey, orderType } = useOrderBy();
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [localFilters, setLocalFilters] = useLocalFilters();
  const [type] = useTicketSwitchType();

  const {
    data: tickets,
    totalCount,
    isFetching,
  } = useSmartSearchTickets({
    page,
    pageSize,
    orderKey,
    orderType,
    filters: localFilters,
    type,
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
      />

      <div className="flex grow overflow-hidden">
        <div className="flex grow flex-col p-[10px] overflow-auto">
          {showStatsPanel && <StatsPanel />}
          <TicketTable
            loading={isFetching}
            tickets={tickets}
            checkedIds={checkedIds}
            onChangeChecked={handleCheckTicket}
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
