import { Select } from 'components/Select';

const options = [
  { key: '', text: '所有时间' },
  { key: 'today', text: '今天' },
  { key: 'yesterday', text: '昨天' },
  { key: 'week', text: '本周' },
  { key: '7d', text: '过去 7 天' },
  { key: 'month', text: '本月' },
  { key: '30d', text: '过去 30 天' },
];

export interface CreatedAtSelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
}

export function CreatedAtSelect({ value, onChange }: CreatedAtSelectProps) {
  return (
    <Select
      closeOnChange
      options={options}
      selected={value ?? ''}
      onSelect={(key) => onChange(key || null)}
    />
  );
}
