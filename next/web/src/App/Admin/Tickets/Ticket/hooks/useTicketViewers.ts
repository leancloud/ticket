import { useMemo } from 'react';
import { useQuery } from 'react-query';
import moment from 'moment';
import _ from 'lodash';

import { http } from '@/leancloud';
import { useUsers } from '@/api/user';

export interface UseTicketViewersOptions {
  id: string;
  createdAt: string;
}

export function useTicketViewers(ticket: UseTicketViewersOptions) {
  const refetchInterval = useMemo(() => {
    const hours = moment().diff(ticket.createdAt, 'hour');
    if (hours < 1) {
      // 1 小时内创建的工单每 10 秒刷新一次
      return 10000;
    }
    // 增加刷新时间, 上限为 24 小时 / 40 秒
    return Math.floor(30000 * (Math.min(24, hours) / 24)) + 10000;
  }, [ticket.createdAt]);

  const { data: viewerIds } = useQuery({
    queryKey: ['TicketViewers', ticket.id],
    queryFn: async () => {
      const res = await http.get<string[]>(`/api/2/tickets/${ticket.id}/viewers`, {
        params: { excludeSelf: 1 },
      });
      return res.data;
    },
    cacheTime: 0,
    refetchInterval,
    keepPreviousData: true,
  });

  const sortedIds = useMemo(() => (viewerIds || []).slice().sort(), [viewerIds]);

  const { data: viewers } = useUsers({
    id: sortedIds,
    queryOptions: {
      enabled: sortedIds.length > 0,
      keepPreviousData: true,
    },
  });

  return useMemo(() => {
    if (viewerIds && viewers) {
      const viewerMap = _.keyBy(viewers, (v) => v.id);
      return viewerIds.map((id) => viewerMap[id]).filter(Boolean);
    }
    return [];
  }, [viewerIds, viewers]);
}
