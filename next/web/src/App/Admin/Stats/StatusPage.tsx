import { useSearchParams } from '@/utils/useSearchParams';
import moment from 'moment';
import { useMemo } from 'react';
import _ from 'lodash';

import { useTicketStatus } from '@/api/ticket-stats';
import { defaultDateRange, STATUS_LOCALE, getRollUp, RangePicker } from './utils';
import { StatsArea } from './Chart';

const StatusStats = () => {
  const [{ from = defaultDateRange.from, to = defaultDateRange.to }] = useSearchParams();
  const { data, isFetching, isLoading } = useTicketStatus({
    from: moment(from).toDate(),
    to: moment(to).toDate(),
  });
  const chartData = useMemo(() => {
    if (!data) {
      return;
    }
    return _(data)
      .orderBy('date')
      .map((v) => {
        const { date, id, ...rest } = v;
        return ([moment(date).toISOString(), rest] as unknown) as [string, Record<string, number>];
      })
      .valueOf();
  }, [data]);
  const rollup = useMemo(() => getRollUp(from, to), [from, to]);
  return (
    <StatsArea
      loading={isFetching || isLoading}
      data={chartData}
      names={(text: string) => STATUS_LOCALE[text as 'waiting' | 'accepted']}
      formatters={{
        titleDisplay: (value) => moment(value).format('YYYY-MM-DD HH:mm'),
        xAxisTick: (value) => moment(value).format(rollup === 'day' ? 'YYYY-MM-DD HH:mm' : 'HH:mm'),
      }}
    />
  );
};

export function StatusPage() {
  const [{ from, to }, { set }] = useSearchParams();
  return (
    <>
      <div className="mb-4">
        <RangePicker
          values={[
            moment(from || defaultDateRange.from).toDate(),
            moment(to || defaultDateRange.to).toDate(),
          ]}
          onChange={([from, to]) => {
            set({
              from: moment(from).startOf('day').toISOString(),
              to: moment(to).endOf('day').toISOString(),
            });
          }}
        />
      </div>
      <div className="w-full relative">
        <StatusStats />
      </div>
    </>
  );
}
