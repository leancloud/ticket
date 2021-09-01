import { useEffect, useMemo, useState } from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import { StringParam, useQueryParam } from 'use-query-params';
import { isEqual, isNull, omitBy } from 'lodash';

import { useTickets } from 'api/ticket';
import { usePage } from 'utils/usePage';
import { Topbar, useOrderBy } from './Topbar';
import { FilterForm, FilterMap, FilterMenu, useTempFilters } from './Filter';
import { useTicketFilter } from './useTicketFilter';
import { TicketList } from './TicketList';

const pageSize = 20;

function TicketsPage() {
  const [showFilter, setShowFilter] = useState(false);
  const [page = 1] = usePage();
  const { orderKey, orderType } = useOrderBy();
  const [filterId] = useQueryParam('filterId', StringParam);

  const { filter, isLoading: isLoadingFilters } = useTicketFilter(filterId);

  const [tempFilters, setTempFilters] = useTempFilters();

  const combinedFilters = useMemo(() => {
    return omitBy({ ...filter?.filters, ...tempFilters }, isNull);
  }, [filter, tempFilters]);

  const { data, isLoading, isFetching } = useTickets({
    pageSize,
    page,
    orderKey,
    orderType,
    filters: combinedFilters,
    queryOptions: {
      enabled: !isLoadingFilters,
      keepPreviousData: true,
    },
  });

  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  useEffect(() => setCheckedIds([]), [data]);

  const tickets = data?.tickets;
  const totalCount = data?.totalCount;

  return (
    <div className="flex flex-col h-full">
      <FilterMenu />

      <Topbar
        className="flex-shrink-0 z-0"
        showFilter={showFilter}
        onChangeShowFilter={setShowFilter}
        pageSize={pageSize}
        count={tickets?.length}
        totalCount={totalCount}
        isLoading={isLoading || isFetching}
        checkedTicketIds={checkedIds}
        onCheckedChange={(checked) => {
          if (checked) {
            tickets && setCheckedIds(tickets.map((t) => t.id));
          } else {
            setCheckedIds([]);
          }
        }}
      />

      <div className="flex flex-grow bg-[#ebeff3] overflow-hidden">
        <div className="flex flex-grow flex-col p-[10px] gap-2 overflow-auto">
          {isLoading ? (
            'Loading...'
          ) : tickets && tickets.length > 0 ? (
            <TicketList
              tickets={tickets}
              checkedIds={checkedIds}
              onCheckedIdsChange={setCheckedIds}
            />
          ) : (
            'No data'
          )}
        </div>

        {showFilter && (
          <FilterForm
            className="flex-shrink-0"
            filters={combinedFilters}
            onChange={(data) => {
              if (filter && filterId) {
                data = omitBy(data, (v, k) => isEqual(v, filter.filters[k as keyof FilterMap]));
              } else {
                data = omitBy(data, isNull);
              }
              setTempFilters(data);
            }}
          />
        )}
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
