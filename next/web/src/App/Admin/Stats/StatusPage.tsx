import { useMemo } from 'react';
import moment from 'moment';
import _ from 'lodash';

import { useTicketStatus } from '@/api/ticket-stats';
import { STATUS_LOCALE, getRollUp, useRangePicker } from './utils';
import { StatsArea } from './Chart';
import { DatePicker } from '@/components/antd';

const StatusStats = () => {
  const [{ from, to }] = useRangePicker();
  const { data, isFetching, isLoading } = useTicketStatus({
    from,
    to,
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
      isStack
      loading={isFetching || isLoading}
      data={chartData}
      names={(text: string) => STATUS_LOCALE[text]}
      initLegend={{
        closed: false,
        fulfilled: false,
      }}
      formatters={{
        titleDisplay: (value) => moment(value).format('YYYY-MM-DD HH:mm'),
        xAxisTick: (value) => moment(value).format(rollup === 'day' ? 'YYYY-MM-DD HH:mm' : 'HH:mm'),
      }}
    />
  );
};

export function StatusPage() {
  const [, rangePickerOptions] = useRangePicker();
  return (
    <>
      <div className="mb-4">
        <DatePicker.RangePicker {...rangePickerOptions} />
      </div>
      <div className="w-full relative">
        <StatusStats />
      </div>
    </>
  );
}
