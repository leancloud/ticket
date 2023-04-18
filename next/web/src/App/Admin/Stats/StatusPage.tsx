import { useMemo } from 'react';
import moment from 'moment';
import _ from 'lodash';

import { useTicketStatus } from '@/api/ticket-stats';
import { useRangePicker, useFilterData } from './utils';
import { Area } from '@/components/Chart';
import { DatePicker } from '@/components/antd';

const STATUS_LOCALE: Record<string, string> = {
  notProcessed: '未处理',
  waitingCustomer: '等待用户回复',
  waitingCustomerService: '等待客服回复',
  preFulfilled: '待用户确认解决',
  fulfilled: '已解决',
  closed: '已关闭',
};

const StatusStats = () => {
  const [{ from, to }] = useRangePicker();
  const { data, isFetching, isLoading } = useTicketStatus({
    from,
    to,
  });
  const [filteredData, { rollup, changeFilter }] = useFilterData(data);
  const chartData = useMemo(
    () =>
      _(filteredData)
        .orderBy('date')
        .map((v) => {
          const { date, id, ...rest } = v;
          return ([
            moment(date).toISOString(),
            {
              notProcessed: rest.notProcessed,
              waitingCustomerService: rest.waitingCustomerService,
              waitingCustomer: rest.waitingCustomer,
              preFulfilled: rest.preFulfilled,
              fulfilled: rest.fulfilled,
              closed: rest.closed,
            },
          ] as unknown) as [string, Record<string, number>];
        })
        .valueOf(),
    [filteredData]
  );
  return (
    <Area
      isStack
      loading={isFetching || isLoading}
      data={chartData}
      names={(text: string) => STATUS_LOCALE[text]}
      initLegend={{
        closed: false,
        fulfilled: false,
        preFulfilled: false,
        waitingCustomer: false,
      }}
      onSelected={(xAxisValues) => {
        if (xAxisValues === undefined) {
          changeFilter();
        } else {
          const from = _.first(xAxisValues);
          const to = _.last(xAxisValues);
          if (from !== to) {
            changeFilter(from, to);
          }
        }
      }}
      formatters={{
        titleDisplay: (value) => moment(value).format('YYYY-MM-DD HH:mm'),
        xAxisTick: (value, item, index) => {
          if (rollup === 'day') {
            return moment(value).format('MM-DD HH:mm');
          }
          const date = moment(value);
          if (index < 1) {
            return date.format('MM-DD HH:mm');
          }
          const preDate = moment(chartData[index - 1][0]);
          if (preDate.isSame(date, 'day')) {
            return date.format('HH:mm');
          } else {
            return date.format('MM-DD HH:mm');
          }
        },
      }}
    />
  );
};

export function StatusPage() {
  const [, rangePickerOptions] = useRangePicker();
  return (
    <div className="p-10">
      <div className="mb-4">
        <DatePicker.RangePicker {...rangePickerOptions} />
      </div>
      <div className="w-full relative">
        <StatusStats />
      </div>
    </div>
  );
}
