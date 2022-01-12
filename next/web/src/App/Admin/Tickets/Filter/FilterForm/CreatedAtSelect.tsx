import { Select } from '@/components/antd';

const EMPTY_VALUE = '';

const options = [
  { value: EMPTY_VALUE, label: '所有时间' },
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'lastMonth', label: '上月' },
];

export interface CreatedAtSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function CreatedAtSelect({ value, onChange }: CreatedAtSelectProps) {
  return (
    <Select
      className="w-full"
      options={options}
      value={value ?? EMPTY_VALUE}
      onSelect={(key: string) => onChange(key === EMPTY_VALUE ? undefined : key)}
    />
  );
}
