import { FunctionComponent, useMemo, useRef } from 'react';
import { Pie, Column, Area, G2 } from '@ant-design/plots';
import _ from 'lodash';

const CHART_VALUE = '$$_chart_value_$$';
const CHART_KEY = '$$_chart_key_$$';
const CHART_TYPE = '$$_chart_TYPE_$$';
interface ChartProps {
  data?: [string, Record<string, number>][];
  loading?: boolean;
  names?: (value: string) => string;
  formatters?: {
    titleDisplay?: (value: string) => string;
    xAxisDisplay?: (value: number) => string;
    yAxisDisplay?: (value: number) => string;
    yAxisTick?: (value: string) => string;
    xAxisTick?: (value: string) => string;
  };
}
export interface ColumnProps extends ChartProps {
  tickInterval?: number;
  onSelected?: (xAxisValues?: string[]) => void;
}
interface PieProps extends Omit<ChartProps, 'formatters' | 'data'> {
  data?: [string, number][];
  formatters?: {
    valueDisplay?: (value: number) => string;
    keyDisplay?: (value: string) => string;
  };
}
interface AreaProps extends ChartProps {
  isStack?: boolean;
}

const convertChartData = (data: ColumnProps['data']) => {
  return _(data || [])
    .map((v) => {
      const [key, values] = v;
      return Object.keys(values).map((valueKey) => {
        return {
          [CHART_VALUE]: values[valueKey],
          [CHART_KEY]: key,
          [CHART_TYPE]: valueKey,
        };
      });
    })
    .flatten()
    .valueOf();
};

export const StatsPie: FunctionComponent<PieProps> = ({ loading, data, names, formatters }) => {
  const chartData = useMemo(() => _.orderBy(convertChartData([]), CHART_VALUE, 'desc'), [data]);
  return (
    <Pie
      loading={loading}
      appendPadding={10}
      autoFit
      colorField={CHART_KEY}
      angleField={CHART_VALUE}
      radius={0.8}
      data={chartData}
      label={{
        type: 'outer',
        content: ({ percent, ...rest }) => {
          if (percent < 0.015) {
            return '';
          }
          return rest[CHART_VALUE];
        },
      }}
      interactions={[
        {
          type: 'element-active',
        },
      ]}
      tooltip={{
        formatter: (datum) => {
          return {
            name: names ? names(datum[CHART_KEY]) : datum[CHART_KEY],
            value: formatters?.valueDisplay
              ? formatters.valueDisplay(datum[CHART_VALUE])
              : datum[CHART_VALUE],
          };
        },
      }}
      legend={{
        itemName: {
          formatter: (text) => (names ? names(text) : text),
        },
      }}
    />
  );
};

export const StatsColumn: FunctionComponent<ColumnProps> = ({
  data,
  loading,
  tickInterval,
  formatters,
  names,
  onSelected,
}) => {
  const $onSelected = useRef(onSelected);
  $onSelected.current = onSelected;
  const chartData = useMemo(() => convertChartData(data), [data]);
  return (
    <Column
      loading={loading}
      data={chartData}
      appendPadding={10}
      autoFit
      seriesField={CHART_TYPE}
      xField={CHART_KEY}
      yField={CHART_VALUE}
      maxColumnWidth={15}
      yAxis={{
        tickInterval: tickInterval,
        label: {
          formatter: formatters?.yAxisTick,
        },
      }}
      xAxis={{
        label: {
          // autoHide: ,
          formatter: formatters?.xAxisTick,
        },
      }}
      brush={{
        enabled: true,
        type: 'x-rect',
      }}
      // interactions={[{ type: 'zoom-in-chart' }]}
      tooltip={{
        title: (value) => (formatters?.titleDisplay ? formatters.titleDisplay(value) : value),
        formatter: (datum) => {
          return {
            name: names ? names(datum[CHART_TYPE]) : datum[CHART_TYPE],
            value: formatters?.xAxisDisplay
              ? formatters.xAxisDisplay(datum[CHART_VALUE])
              : datum[CHART_VALUE],
          };
        },
      }}
      onEvent={(chart, event) => {
        if (event.type === G2.BRUSH_FILTER_EVENTS.AFTER_FILTER) {
          if ($onSelected.current) {
            const xValues = event.view.getXScale().values;
            $onSelected.current(xValues);
          }
        }
        if (event.type === G2.BRUSH_FILTER_EVENTS.BEFORE_RESET) {
          $onSelected.current && $onSelected.current();
        }
      }}
      legend={false}
    />
  );
};

export const StatsArea: FunctionComponent<AreaProps> = ({
  loading,
  data,
  names,
  formatters,
  isStack,
}) => {
  const chartData = useMemo(
    () =>
      _(data || [])
        .map((v) => {
          const [key, values] = v;
          return Object.keys(values).map((valueKey) => {
            return {
              [CHART_VALUE]: values[valueKey],
              [CHART_KEY]: key,
              [CHART_TYPE]: valueKey,
            };
          });
        })
        .flatten()
        .valueOf(),
    [data]
  );
  return (
    <Area
      data={chartData}
      loading={loading}
      appendPadding={10}
      autoFit
      isStack={isStack}
      seriesField={CHART_TYPE}
      xField={CHART_KEY}
      yField={CHART_VALUE}
      yAxis={{
        min: 1,
      }}
      xAxis={{
        label: {
          // autoHide: false,
          formatter: formatters?.xAxisTick,
        },
      }}
      tooltip={{
        title: (value) => (formatters?.titleDisplay ? formatters.titleDisplay(value) : value),
        formatter: (datum) => {
          const type = datum[CHART_TYPE];
          return {
            name: names ? names(type) : type,
            value: datum[CHART_VALUE],
          };
        },
      }}
      legend={{
        position: 'bottom',
        itemName: {
          formatter: (text) => (names ? names(text) : text),
        },
      }}
    />
  );
};
