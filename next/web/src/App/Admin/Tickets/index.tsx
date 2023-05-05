import { useCallback, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import { useSearchTickets, useTickets, UseTicketsOptions } from '@/api/ticket';
import { usePage, usePageSize } from '@/utils/usePage';
import { Topbar, useOrderBy } from './Topbar';
import { FilterForm, LocalFiltersProvider, useLocalFilters } from './Filter';
import { TicketTable } from './TicketTable';
import { TicketDetail } from './Ticket/TicketDetail';
import { StatsPanel } from './TicketStats';
import { SortLimited } from './Filter/useSorterLimited';

const DEFAULT_PAGE_SIZE = 20;

interface UseSmartFetchTicketsOptions extends UseTicketsOptions {
  keyword?: string;
  field?: boolean;
}

function useSmartSearchTickets({
  keyword,
  field,
  queryOptions,
  ...options
}: UseSmartFetchTicketsOptions) {
  const isSearch = !!keyword && !field;

  const useTicketResult = useTickets({
    ...options,
    queryOptions: {
      ...queryOptions,
      enabled: !isSearch,
    },
  });

  const useSearchTicketsResult = useSearchTickets(keyword!, {
    ...options,
    queryOptions: {
      ...queryOptions,
      enabled: isSearch,
    },
  });

  return isSearch ? useSearchTicketsResult : useTicketResult;
}

function TicketListView() {
  const [page, { set: setPage }] = usePage();
  const [pageSize = DEFAULT_PAGE_SIZE, setPageSize] = usePageSize();
  const { orderKey, orderType } = useOrderBy();
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [localFilters, setLocalFilters] = useLocalFilters();

  const { data: tickets, totalCount, isFetching } = useSmartSearchTickets({
    page,
    pageSize,
    orderKey,
    orderType,
    filters: localFilters,
    keyword: localFilters.keyword,
    field: !!(localFilters.fieldName && localFilters.fieldValue),
    queryOptions: {
      keepPreviousData: true,
    },
  });

  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  useEffect(() => setCheckedIds([]), [tickets]);

  const handleCheckTicket = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setCheckedIds((prev) => [...prev, id]);
    } else {
      setCheckedIds((prev) => prev.filter((_id) => _id !== id));
    }
  }, []);

  const handleCheckAll = useCallback(
    (checked: boolean) => {
      if (tickets) {
        if (checked) {
          setCheckedIds(tickets.map((t) => t.id));
        } else {
          setCheckedIds([]);
        }
      }
    },
    [tickets]
  );

  useEffect(() => {
    if (localFilters.keyword) {
      setShowStatsPanel(false);
    }
  }, [localFilters.keyword]);

  return (
    <div className="flex flex-col h-full">
      <SortLimited>
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
      </SortLimited>
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
            <TicketListView />
          </LocalFiltersProvider>
        }
      />
      <Route path=":id" element={<TicketDetail />} />
    </Routes>
  );
}
