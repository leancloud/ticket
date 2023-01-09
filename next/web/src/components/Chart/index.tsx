import { FunctionComponent, useMemo, useRef } from 'react';
import {
  Pie as OriginPie,
  Column as OriginColumn,
  Area as OriginArea,
  G2,
  Sunburst,
} from '@ant-design/plots';
import _ from 'lodash';
import { zoomInChartInteraction } from './Interactions';

G2.registerInteraction(zoomInChartInteraction.name, zoomInChartInteraction.content);

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
    xAxisTick?: (value: string, item: object, index: number) => string;
  };
}
export interface ColumnProps extends ChartProps {
  tickInterval?: number;
  onSelected?: ((xAxisValues?: string[]) => void) | false;
}
export interface PieProps extends Omit<ChartProps, 'formatters' | 'data'> {
  innerRadius?: number;
  data?: [string, number][];
  showLegend?: boolean;
  formatters?: {
    valueDisplay?: (value: number) => string;
    labelDisplay?: (value: string) => string;
  };
}
export interface AreaProps extends ChartProps {
  isStack?: boolean;
  initLegend?: Record<string, boolean>;
  onSelected?: (xAxisValues?: string[]) => void;
}

export type MultiPieNode = { name: string; value?: number; children?: MultiPieNode[] };
export interface MultiPieProps extends Omit<PieProps, 'formatters' | 'data' | 'names'> {
  data?: MultiPieNode;
  formatters?: {
    valueDisplay?: (value: number) => string;
  };
}

export const Pie: FunctionComponent<PieProps> = ({
  loading,
  data,
  names,
  formatters,
  innerRadius,
  showLegend = true,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    return _(data)
      .map(([key, value]) => ({
        [CHART_VALUE]: value,
        [CHART_KEY]: key,
      }))
      .orderBy(CHART_VALUE, 'desc')
      .valueOf();
  }, [data]);
  return (
    <OriginPie
      locale="zh-CN"
      loading={loading}
      padding={'auto'}
      autoFit
      radius={0.75}
      colorField={CHART_KEY}
      angleField={CHART_VALUE}
      innerRadius={innerRadius}
      statistic={{
        title: false,
        content: false,
      }}
      data={chartData}
      label={{
        type: 'outer',
        content: ({ percent, ...rest }) => {
          if (percent < 0.015) {
            return '';
          }
          return names ? names(rest[CHART_KEY]) : rest[CHART_KEY];
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
      legend={
        showLegend
          ? {
              itemName: {
                formatter: (text) => (names ? names(text) : text),
              },
            }
          : false
      }
    />
  );
};

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

export const Column: FunctionComponent<ColumnProps> = ({
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
    <OriginColumn
      locale="zh-CN"
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
        enabled: onSelected === false ? false : true,
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

export const Area: FunctionComponent<AreaProps> = ({
  loading,
  data,
  names,
  formatters,
  isStack,
  initLegend,
  onSelected,
}) => {
  const $onSelected = useRef(onSelected);
  $onSelected.current = onSelected;
  const chartData = useMemo(() => convertChartData(data), [data]);
  return (
    <OriginArea
      locale="zh-CN"
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
      interactions={[
        {
          type: zoomInChartInteraction.name,
        },
      ]}
      legend={{
        position: 'bottom',
        selected: initLegend,
        itemName: {
          formatter: (text) => (names ? names(text) : text),
        },
      }}
    />
  );
};

export const MultiPie: FunctionComponent<MultiPieProps> = ({
  loading,
  data: chartData,
  formatters,
  innerRadius,
}) => {
  return (
    <Sunburst
      locale="zh-CN"
      loading={loading}
      data={chartData || {}}
      padding={'auto'}
      radius={0.8}
      autoFit
      innerRadius={innerRadius || 0.3}
      drilldown={{
        breadCrumb: {
          position: 'top-left',
          textStyle: {
            fill: '#15c5ce',
          },
        },
      }}
      label={{
        layout: [
          {
            type: 'limit-in-shape',
          },
        ],
      }}
      tooltip={{
        customContent: (title, data) => {
          const background = data[0] ? data[0].color : 'transparent';
          // const paths = data[0] ? data[0].data.path.split(' / ') : [];
          const value = data[0]
            ? formatters?.valueDisplay
              ? formatters.valueDisplay(data[0].value)
              : data[0]?.value
            : undefined;
          return `
              <div class="g2-tooltip-title" style="margin-bottom: 12px; margin-top: 12px;"></div>
              <ul class="g2-tooltip-list" style="margin: 0px; list-style-type: none; padding: 0px;">
                <li
                  class="g2-tooltip-list-item"
                  data-index=""
                  style="list-style-type: none; padding: 0px; margin: 12px 0px;"
                >
                  <span
                    class="g2-tooltip-marker"
                    style="background: ${background}; width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 8px;"
                  ></span>
                  <span class="g2-tooltip-name">${data[0]?.name}</span>:
                  <span
                    class="g2-tooltip-value"
                    style="display: inline-block; float: right; margin-left: 30px;"
                  >
                    ${value}
                  </span>
                </li>
              </ul>
          `;
        },
      }}
    />
  );
};
