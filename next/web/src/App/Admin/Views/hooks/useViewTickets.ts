import { useQuery, useQueryClient } from 'react-query';
import { produce } from 'immer';

import {
  ViewSchema,
  useViewTickets as _useViewTickets,
  ViewTicketCountResult,
  testView,
} from '@/api/view';

export interface UseViewTicketsOptions {
  view?: ViewSchema;
  tempView?: {
    conditions: ViewSchema['conditions'];
    sortBy?: ViewSchema['sortBy'];
    sortOrder?: ViewSchema['sortOrder'];
  };
  page?: number;
  pageSize?: number;
}

export function useViewTickets({ view, tempView, page, pageSize }: UseViewTicketsOptions) {
  const queryClient = useQueryClient();
  const refetchInterval = 1000 * 60;

  const viewTicketsQuery = _useViewTickets(view?.id ?? '', {
    page,
    pageSize,
    queryOptions: {
      enabled: !!(view && !tempView),
      refetchInterval,
      onSuccess: ({ totalCount }) => {
        queryClient.setQueriesData<ViewTicketCountResult[] | undefined>(
          ['viewTicketCounts'],
          (data) => {
            if (data && view) {
              const index = data.findIndex((t) => t.viewId === view.id);
              if (index >= 0) {
                return produce(data, (data) => {
                  data[index].ticketCount = totalCount;
                });
              }
            }
          }
        );
      },
    },
  });

  const tempViewTicketsQuery = useQuery({
    enabled: !!(view && tempView),
    queryKey: ['testView', tempView, view?.fields, page, pageSize],
    queryFn: () => testView({ ...tempView!, fields: view!.fields, page, pageSize }),
    refetchInterval,
  });

  return tempView
    ? {
        ...tempViewTicketsQuery,
        data: tempViewTicketsQuery.data?.tickets,
        totalCount: tempViewTicketsQuery.data?.totalCount,
      }
    : viewTicketsQuery;
}
