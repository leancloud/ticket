import { FunctionComponent, useCallback, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { Statistic, Card, Divider, Radio, DatePicker } from '@/components/antd';
import { CategorySelect } from '@/components/common';
import { useSearchParams, useSearchParam } from '@/utils/useSearchParams';
import { useTicketCount, useTicketStats } from '@/api/ticket-stats';
import { StatsDetails } from './StatsDetails';
import { CustomerServiceSelect, useRangePicker, useStatsParams } from './utils';

export const STATS_FIELD = [
  'created',
  'closed',
  'reopened',
  'conversion',
  // 'internalConversion',
  // 'externalConversion',
  'firstReplyTimeAVG',
  'replyTimeAVG',
  'naturalReplyTimeAVG',
  'replyCount',
  'internalReplyCount',
] as const;
export type StatsField = typeof STATS_FIELD[number];
export const STATS_FIELD_LOCALE: Record<StatsField, string> = {
  created: '新建工单',
  closed: '关单数',
  reopened: '激活工单数',
  conversion: '流转数',
  // internalConversion: '内部流转数',
  // externalConversion: '外部流转数',
  firstReplyTimeAVG: '平均首次回复时间',
  replyTimeAVG: '平均回复时间',
  naturalReplyTimeAVG: '平均回复自然时间',
  replyCount: '对外回复数',
  internalReplyCount: '对内回复数',
};

enum FILTER_TYPE {
  all = 'all',
  customerService = 'customerService',
  category = 'category',
}
const ToolBar: FunctionComponent<{
  className?: string;
}> = ({ className }) => {
  const $categoryRef = useRef<string>();
  const [, rangePickerOptions] = useRangePicker();
  const [{ customerService, category, group, ...rest }, { set }] = useSearchParams();
  const [tmpCategory, setTmpCategory] = useState(category);
  const [filterType, setFilterType] = useState<FILTER_TYPE>(() => {
    if (category) {
      return FILTER_TYPE.category;
    }
    if (customerService || group) {
      return FILTER_TYPE.customerService;
    }
    return FILTER_TYPE.all;
  });
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
          value={customerService || group}
          onClear={() => {
            set({ customerService: undefined, group: undefined, ...rest });
          }}
          onCustomerServiceChange={(value) =>
            set({ customerService: value, ...rest, group: undefined })
          }
          onGroupChange={(value) => {
            set({ group: value, ...rest, customerService: undefined });
          }}
        />
      )}
      {filterType === FILTER_TYPE.category && (
        <CategorySelect
          changeOnSelect
          categoryActive={true}
          placeholder="请选择分类"
          value={tmpCategory}
          onDropdownVisibleChange={(visible) => {
            if (!visible) {
              set({ category: $categoryRef.current, ...rest });
            }
          }}
          onChange={(value) => {
            setTmpCategory(value);
            $categoryRef.current = value;
          }}
        />
      )}
      <Divider type="vertical" />
      <DatePicker.RangePicker {...rangePickerOptions} />
    </div>
  );
};

export const useActiveField = (defaultValue = STATS_FIELD[0]) => {
  const [field = defaultValue, setField] = useSearchParam('active');
  return [field as StatsField, setField] as const;
};

const StatCards = () => {
  const params = useStatsParams();
  const [active, setActive] = useActiveField();
  const { data, isFetching, isLoading } = useTicketStats(params);
  const { data: count, isFetching: countFetching, isLoading: countLoading } = useTicketCount({
    from: params.from,
    to: params.to,
  });
  const averageData = useMemo(() => {
    if (!data) {
      return;
    }
    const {
      firstReplyCount,
      firstReplyTime = 0,
      replyTime = 0,
      replyTimeCount,
      naturalReplyTime,
      naturalReplyCount,
    } = data;
    return {
      ...data,
      replyTimeAVG: Math.ceil(replyTime / (replyTimeCount || 1)),
      firstReplyTimeAVG: Math.ceil(firstReplyTime / (firstReplyCount || 1)),
      naturalReplyTimeAVG: Math.ceil(naturalReplyTime / (naturalReplyCount || 1)),
    };
  }, [data]);

  const getExtraProps = useCallback((field: StatsField) => {
    if (['replyTimeAVG', 'firstReplyTimeAVG', 'naturalReplyTimeAVG'].includes(field)) {
      return {
        formatter: (value: number | string) => (Number(value) / 3600).toFixed(2),
        suffix: '小时',
      };
    }
    return {};
  }, []);

  return (
    <div className="flex flex-wrap -m-1">
      {STATS_FIELD.map((type) => {
        return (
          <Card
            loading={isFetching || isLoading}
            key={type}
            className={classnames('!m-1 basis-52 grow-0 shrink-0 cursor-pointer', {
              '!border-primary': type === active,
            })}
            onClick={() => active !== type && setActive(type)}
          >
            <Statistic
              loading={isFetching || isLoading}
              title={STATS_FIELD_LOCALE[type]}
              value={averageData ? averageData[type] || 0 : 0}
              {...getExtraProps(type)}
            />
          </Card>
        );
      })}

      <Card
        loading={countFetching || countLoading}
        className="!m-1 basis-52 grow-0 shrink-0 cursor-not-allowed"
      >
        <Statistic loading={countFetching || countLoading} title="活跃工单数" value={count} />
      </Card>
    </div>
  );
};

export default function StatsPage() {
  return (
    <>
      <ToolBar className="mb-4" />
      <StatCards />
      <Divider />
      <StatsDetails />
    </>
  );
}
