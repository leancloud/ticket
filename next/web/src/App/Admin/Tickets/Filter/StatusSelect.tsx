import { Select } from 'components/Select';

const options = [
  { key: 50, text: '新工单' },
  { key: 120, text: '等待客服回复' },
  { key: 160, text: '已回复用户' },
  { key: 220, text: '待用户确认' },
  { key: 250, text: '已解决' },
  { key: 280, text: '已关闭' },
];

export interface StatusSelectProps {
  value?: number[];
  onChange: (value: number[]) => void;
}

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  return (
    <Select
      placeholder="任何"
      options={options}
      selected={value}
      onSelect={(key) => onChange(value ? value.concat(key) : [key])}
      onDeselect={(key) => value && onChange(value.filter((v) => v !== key))}
    />
  );
}
