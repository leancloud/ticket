import { UseInfiniteQueryOptions, useInfiniteQuery } from 'react-query';

import { useAuth } from '@/states/auth';
import { useRootCategory } from '@/states/root-category';
import { getTickets } from '@/api/ticket';
import { TicketListItem } from '@/types';
import { TicketResolvedStatus } from '../Ticket';

const TICKETS_PAGE_SIZE = 20;

interface UseTicketsOptions {
  status: TicketResolvedStatus;
  queryOptions?: UseInfiniteQueryOptions<TicketListItem[]>;
}

export function useTickets({ status, queryOptions }: UseTicketsOptions) {
  const category = useRootCategory();
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['tickets', { status }],
    queryFn: ({ pageParam = 1 }) => {
      return getTickets({
        rootCategoryId: category.id,
        authorId: user?.id,
        page: pageParam,
        pageSize: TICKETS_PAGE_SIZE,
        orderBy: 'latestCustomerServiceReplyAt-desc',
        include: ['unreadCount'],
        status,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === TICKETS_PAGE_SIZE) {
        return allPages.length + 1;
      }
    },
    ...queryOptions,
    enabled: user !== undefined && queryOptions?.enabled,
  });
}
