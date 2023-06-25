import { useMemo, useState } from 'react';
import moment, { Moment } from 'moment';

import { DatePicker, Select } from '@/components/antd';

const { RangePicker } = DatePicker;

const EMPTY_VALUE = '';
const RANGE_VALUE = 'range';

const options = [
  { value: EMPTY_VALUE, label: '所有时间' },
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'lastMonth', label: '上月' },
  { value: RANGE_VALUE, label: '选择时间段' },
];

export interface CreatedAtSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

export function CreatedAtSelect({ value, onChange, disabled }: CreatedAtSelectProps) {
  const rangeValue = useMemo(() => {
    if (value?.includes('..')) {
      return value.split('..').map((str) => moment(str));
    }
  }, [value]);

  const [rangeMode, setRangeMode] = useState(rangeValue !== undefined);

  const handleChange = (value: string) => {
    if (value === RANGE_VALUE) {
      setRangeMode(true);
      return;
    }
    setRangeMode(false);
    onChange(value === EMPTY_VALUE ? undefined : value);
  };

  const handleChangeRange = (range: [Moment, Moment] | null) => {
    if (!range) {
      onChange(undefined);
      return;
    }
    const [starts, ends] = range;
    onChange(`${starts.toISOString()}..${ends.toISOString()}`);
  };

  const showRangePicker = rangeMode || rangeValue !== undefined;
  return (
    <>
      <Select
        className="w-full"
        options={options}
        value={showRangePicker ? RANGE_VALUE : value ?? EMPTY_VALUE}
        onChange={handleChange}
        disabled={disabled}
      />
      {showRangePicker && (
        <div className="pl-2 border-l border-gray-300 border-dashed">
          <div className="my-2 text-[#475867] text-sm font-medium">时间段</div>
          <RangePicker
            className="w-full"
            value={rangeValue as any}
            onChange={handleChangeRange as any}
            showTime={{
              defaultValue: [moment('00:00:00', 'HH:mm:ss'), moment('23:59:59', 'HH:mm:ss')],
            }}
          />
        </div>
      )}
    </>
  );
}
