import { useCallback, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useLocalStorage } from 'react-use';

import { useSearchTickets, useTickets, UseTicketsOptions } from '@/api/ticket';
import { usePage } from '@/utils/usePage';
import { Topbar, useOrderBy } from './Topbar';
import { FilterForm, useLocalFilters } from './Filter';
import { TicketView } from './TicketView';
import { Ticket } from './Ticket';

const pageSize = 20;

function useLayout() {
  const [layout = 'table', ...rest] = useLocalStorage<'card' | 'table'>(
    'TapDesk:ticketLayout',
    undefined,
    {
      raw: true,
    }
  );
  return [layout, ...rest] as const;
}

interface UseSmartFetchTicketsOptions extends UseTicketsOptions {
  keyword?: string;
}

function useSmartSearchTickets({ keyword, queryOptions, ...options }: UseSmartFetchTicketsOptions) {
  const useTicketResult = useTickets({
    ...options,
    queryOptions: {
      ...queryOptions,
      enabled: !keyword,
    },
  });

  const useSearchTicketsResult = useSearchTickets(keyword!, {
    ...options,
    queryOptions: {
      ...queryOptions,
      enabled: !!keyword,
    },
  });

  return keyword ? useSearchTicketsResult : useTicketResult;
}

function TicketListView() {
  const [page] = usePage();
  const { orderKey, orderType } = useOrderBy();
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [layout, setLayout] = useLayout();

  const [localFilters, setLocalFilters] = useLocalFilters();

  const { data: tickets, totalCount, isLoading, isFetching } = useSmartSearchTickets({
    page,
    pageSize,
    orderKey,
    orderType,
    filters: localFilters,
    keyword: localFilters.keyword,
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

  return (
    <div className="flex flex-col h-full">
      <Topbar
        className="shrink-0 z-10"
        showFilter={showFilterForm}
        onChangeShowFilter={setShowFilterForm}
        pageSize={pageSize}
        count={tickets?.length}
        totalCount={totalCount}
        isLoading={isLoading || isFetching}
        checkedTicketIds={checkedIds}
        onCheckedChange={handleCheckAll}
        layout={layout}
        onChangeLayout={setLayout}
      />

      <div className="flex grow overflow-hidden">
        <div className="flex grow flex-col p-[10px] gap-2 overflow-auto">
          {isLoading && 'Loading...'}
          {tickets && tickets.length === 0 && 'No data'}
          {tickets && tickets.length > 0 && (
            <TicketView
              layout={layout}
              tickets={tickets}
              checkedIds={checkedIds}
              onChangeChecked={handleCheckTicket}
            />
          )}
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
      <Route index element={<TicketListView />} />
      <Route path=":id" element={<Ticket />} />
    </Routes>
  );
}
