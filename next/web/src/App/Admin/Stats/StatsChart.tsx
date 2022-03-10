import { FunctionComponent, useMemo } from 'react';
import { Pie, Column, Line } from '@ant-design/plots';
import _ from 'lodash';

const CHART_VALUE = '$$_chart_value_$$';
const CHART_KEY = '$$_chart_key_$$';
const CHART_TYPE = '$$_chart_TYPE_$$';
interface ChartProps {
  data?: [string, number][];
  loading?: boolean;
  tooltipFormatter?: (
    value: number | string,
    key: string
  ) => {
    name: string;
    value: string | number;
  };
}

interface PieProps extends ChartProps {
  legendFormatter?: (text: string) => string;
}
interface ColumnProps extends ChartProps {
  yAxis?: {
    tickInterval?: number;
    formatter?: (value: string) => string;
  };
}

interface LineProps extends Omit<ChartProps, 'data'> {
  data?: [string, Record<string, number>][];
}

const convertChartData = (data: ChartProps['data']) => {
  if (!data || data.length === 0) {
    return [];
  }
  return data.map(([key, value]) => {
    return {
      [CHART_VALUE]: value,
      [CHART_KEY]: key,
    };
  });
};

export const StatsPie: FunctionComponent<PieProps> = ({
  loading,
  data,
  tooltipFormatter,
  legendFormatter,
}) => {
  const chartData = useMemo(() => convertChartData(data), [data]);
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
      }}
      interactions={[
        {
          type: 'element-active',
        },
      ]}
      tooltip={{
        formatter: tooltipFormatter
          ? (datum) => {
              return tooltipFormatter(datum[CHART_VALUE], datum[CHART_KEY]);
            }
          : undefined,
      }}
      legend={{
        itemName: {
          formatter: legendFormatter,
        },
      }}
    />
  );
};

export const StatsColumn: FunctionComponent<ColumnProps> = ({
  data,
  loading,
  yAxis,
  tooltipFormatter,
}) => {
  const chartData = useMemo(() => convertChartData(data), [data]);
  return (
    <Column
      loading={loading}
      data={chartData}
      appendPadding={10}
      autoFit
      xField={CHART_KEY}
      yField={CHART_VALUE}
      maxColumnWidth={15}
      yAxis={{
        tickInterval: yAxis?.tickInterval,
        // grid: null,
        label: {
          autoRotate: false,
          formatter: yAxis?.formatter,
        },
      }}
      tooltip={{
        formatter: tooltipFormatter
          ? (datum) => {
              return tooltipFormatter(datum[CHART_VALUE], datum[CHART_KEY]);
            }
          : undefined,
      }}
    />
  );
};

const Colors = ['#15c5ce', '#155bd4'];
export const StatsLine: FunctionComponent<LineProps> = ({ loading, data }) => {
  const types = useMemo(() => (data ? Object.keys(data[0][1]) : []), [data]);
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
        .orderBy(CHART_KEY)
        .valueOf(),
    [data]
  );
  return (
    <Line
      data={chartData}
      loading={loading}
      appendPadding={10}
      autoFit
      seriesField={CHART_TYPE}
      xField={CHART_KEY}
      yField={CHART_VALUE}
      color={(params) => {
        return Colors[types.indexOf(params[CHART_TYPE])];
      }}
      legend={{
        position: 'bottom',
      }}
    />
  );
};
