import { FunctionComponent, useMemo, useState } from 'react';
import classnames from 'classnames';
import { Statistic, Card, Divider, DatePicker, Radio, StatisticProps } from '@/components/antd';
import { CategorySelect, CustomerServiceSelect } from '@/components/common';
import { useSearchParams, useSearchParam } from '@/utils/useSearchParams';
import { relativeDateGetters } from '@/utils/date-range';
import moment from 'moment';
import { useTicketStats } from '@/api/ticket-stats';
import { StatsDetails } from './StatsDetails';

enum FILTER_TYPE {
  all = 'all',
  customerService = 'customerService',
  category = 'category',
}
const RANGE_DATE = ['lastWeek', 'week', 'month', 'lastMonth'] as const;
const RANGE_DATE_LOCALE = {
  lastWeek: '上周',
  week: '本周',
  month: '本月',
  lastMonth: '上个月',
};
export const defaultDateRange = relativeDateGetters['week']();

const ToolBar: FunctionComponent<{
  className?: string;
}> = ({ className }) => {
  const [{ customerService, category, ...rest }, { set }] = useSearchParams();
  const [tmpCategory, setTmpCategory] = useState(category);
  const [filterType, setFilterType] = useState<FILTER_TYPE>(() => {
    if (category) {
      return FILTER_TYPE.category;
    }
    if (customerService) {
      return FILTER_TYPE.customerService;
    }
    return FILTER_TYPE.all;
  });
  const rangeDates = useMemo(() => {
    return RANGE_DATE.reduce(
      (pre, curr) => {
        const key = RANGE_DATE_LOCALE[curr];
        const dateRange = relativeDateGetters[curr]();
        pre[key] = [moment(dateRange.from), moment(dateRange.to)];
        return pre;
      },
      {} as {
        [key: string]: [moment.Moment, moment.Moment];
      }
    );
  }, []);
  const radioOptions = useMemo(() => {
    return [
      { label: '全部', value: FILTER_TYPE.all },
      { label: '按客服筛选', value: FILTER_TYPE.customerService },
      { label: '按分类筛选', value: FILTER_TYPE.category },
    ];
  }, []);

  return (
    <div className={className}>
      <Radio.Group
        options={radioOptions}
        onChange={(e) => {
          setFilterType(e.target.value);
          if (e.target.value === FILTER_TYPE.all) {
            set(rest);
          }
        }}
        value={filterType}
        optionType="button"
        className="!mr-2"
      />
      {filterType === FILTER_TYPE.customerService && (
        <CustomerServiceSelect
          allowClear
          placeholder="请选择客服"
          className="min-w-[184px]"
          value={customerService}
          onChange={(value) => set({ customerService: value as string, ...rest })}
        />
      )}
      {filterType === FILTER_TYPE.category && (
        <CategorySelect
          changeOnSelect
          placeholder="请选择分类"
          value={tmpCategory}
          onDropdownVisibleChange={(visible) => {
            if (!visible) {
              set({ category: tmpCategory, ...rest });
            }
          }}
          onChange={(value) => setTmpCategory(value)}
        />
      )}
      <Divider type="vertical" />
      <DatePicker.RangePicker
        value={[moment(rest.from || defaultDateRange.from), moment(rest.to || defaultDateRange.to)]}
        ranges={rangeDates}
        allowClear
        onChange={(dates: [moment.Moment, moment.Moment]) => {
          set({
            ...rest,
            customerService,
            category,
            from: dates[0].startOf('day').toISOString(),
            to: dates[1].endOf('day').toISOString(),
          });
        }}
      />
    </div>
  );
};

const STATS_FIELD = [
  'created',
  'closed',
  'reopened',
  'conversion',
  // 'internalConversion',
  // 'externalConversion',
  'firstReplyTimeAVG',
  'replyTimeAVG',
  'replyCount',
  'internalReplyCount',
] as const;
export type StatsField = typeof STATS_FIELD[number];
export const STATS_FIELD_LOCALE = {
  created: '新建工单',
  closed: '关单数',
  reopened: '激活工单数',
  conversion: '流转数',
  // internalConversion: '内部流转数',
  // externalConversion: '外部流转数',
  firstReplyTimeAVG: '平均首次回复时间',
  replyTimeAVG: '平均回复时间',
  replyCount: '对外回复数',
  internalReplyCount: '对内回复数',
};

export const STATUS_LOCALE = {
  accepted: '受理中',
  waiting: '等待回复',
};

const defaultActiveField = STATS_FIELD[0];
const timeProps = {
  formatter: (value: number | string) => (Number(value) / 3600).toFixed(2),
  suffix: '小时',
};

const timeFieldProps: {
  [key in StatsField]?: StatisticProps;
} = {
  replyTimeAVG: timeProps,
  firstReplyTimeAVG: timeProps,
};

const StatCards = () => {
  const [parmas] = useSearchParams();
  const [activeCard = defaultActiveField, setActiveCard] = useSearchParam('active');
  const { data, isFetching, isLoading } = useTicketStats({
    category: parmas.category,
    customerService: parmas.customerService,
    from: moment(parmas.from || defaultDateRange.from).toDate(),
    to: moment(parmas.to || defaultDateRange.to).toDate(),
  });
  const averageData = useMemo(() => {
    if (!data) {
      return;
    }
    const { firstReplyCount, firstReplyTime = 0, replyTime = 0, replyTimeCount, ...rest } = data;
    return {
      ...rest,
      replyTimeAVG: Math.ceil(replyTime / (replyTimeCount || 1)),
      firstReplyTimeAVG: Math.ceil(firstReplyTime / (firstReplyCount || 1)),
    };
  }, [data]);

  return (
    <div className="flex flex-wrap -m-1">
      {STATS_FIELD.map((type) => {
        return (
          <Card
            key={type}
            className={classnames('!m-1 basis-52 grow-0 shrink-0 cursor-pointer', {
              '!border-primary': type === activeCard,
            })}
            onClick={() => activeCard !== type && setActiveCard(type)}
          >
            <Statistic
              loading={isFetching || isLoading}
              title={STATS_FIELD_LOCALE[type]}
              value={averageData ? averageData[type] || 0 : 0}
              {...timeFieldProps[type]}
            />
          </Card>
        );
      })}
    </div>
  );
};

const Stats = () => {
  const [field = defaultActiveField] = useSearchParam('active');
  return (
    <div className="h-full overflow-auto p-4 ">
      <ToolBar className="mb-4" />
      <StatCards />
      <Divider />
      <StatsDetails field={field as StatsField} />
    </div>
  );
};

export default Stats;
