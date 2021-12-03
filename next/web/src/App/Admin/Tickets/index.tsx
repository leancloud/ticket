import { useCallback, useEffect, useMemo, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import { useTickets } from '@/api/ticket';
import { usePage } from '@/utils/usePage';
import { Topbar, useOrderBy } from './Topbar';
import { FilterForm, FilterMenu } from './Filter';
import { useTicketFilter, useLocalFilters } from './useTicketFilter';
import { TicketList } from './TicketList';
import { useSearchParam } from 'utils/useSearchParams';

const pageSize = 20;

function TicketListView() {
  const [page] = usePage();
  const { orderKey, orderType } = useOrderBy();
  const [showFilterForm, setShowFilterForm] = useState(false);

  const [filterId] = useSearchParam('filterId');
  const { filter, isLoading: isLoadingFilter } = useTicketFilter(filterId);
  const [localFilters, setLocalFilters] = useLocalFilters(filter?.filters);
  const filters = useMemo(() => {
    return { ...filter?.filters, ...localFilters };
  }, [filter, localFilters]);

  const { data: tickets, totalCount, isLoading, isFetching } = useTickets({
    page,
    orderKey,
    orderType,
    filters,
    queryOptions: {
      enabled: !isLoadingFilter,
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
      <FilterMenu />

      <Topbar
        className="flex-shrink-0 z-0"
        showFilter={showFilterForm}
        onChangeShowFilter={setShowFilterForm}
        pageSize={pageSize}
        count={tickets?.length}
        totalCount={totalCount}
        isLoading={isLoading || isFetching}
        checkedTicketIds={checkedIds}
        onCheckedChange={handleCheckAll}
      />

      <div className="flex flex-grow overflow-hidden">
        <div className="flex flex-grow flex-col p-[10px] gap-2 overflow-auto">
          {isLoading && 'Loading...'}
          {tickets && tickets.length === 0 && 'No data'}
          {tickets && tickets.length > 0 && (
            <TicketList
              tickets={tickets}
              checkedIds={checkedIds}
              onClickCheckbox={handleCheckTicket}
            />
          )}
        </div>

        {showFilterForm && (
          <FilterForm className="flex-shrink-0" filters={filters} onChange={setLocalFilters} />
        )}
      </div>
    </div>
  );
}

export default function TicketRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TicketListView />} />
    </Routes>
  );
}
