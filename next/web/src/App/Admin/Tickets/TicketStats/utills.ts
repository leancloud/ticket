import { TicketStatsRealtimeParams, useTicketStatsRealtime } from '@/api/ticket-stats';
import { useLocalFilters } from '../Filter';

export const useStatsData = (type: TicketStatsRealtimeParams['type']) => {
  const [localFilters] = useLocalFilters();
  return useTicketStatsRealtime({
    ...localFilters,
    type,
    queryOptions: {
      staleTime: 1000 * 60 * 5,
    },
  });
};

export const STATUS_LOCALE: Record<string, string> = {
  notProcessed: '未处理',
  waitingCustomer: '等待用户回复',
  waitingCustomerService: '等待客服回复',
  preFulfilled: '待用户确认解决',
  fulfilled: '已解决',
  closed: '已关闭',
};
