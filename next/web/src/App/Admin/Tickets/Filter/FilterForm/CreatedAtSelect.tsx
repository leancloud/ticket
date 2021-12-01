import { Select } from '@/components/antd';

const options = [
  { value: '', label: '所有时间' },
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: 'week', label: '本周' },
  { value: '7d', label: '过去 7 天' },
  { value: 'month', label: '本月' },
  { value: '30d', label: '过去 30 天' },
  // TODO: add last month
];

export interface CreatedAtSelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
}

export function CreatedAtSelect({ value, onChange }: CreatedAtSelectProps) {
  return (
    <Select
      className="w-full"
      options={options}
      value={value ?? ''}
      onSelect={(key) => onChange(key || null)}
    />
  );
}
