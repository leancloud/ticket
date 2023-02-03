import { Select } from '@/components/antd';

const options = [
  { value: 50, label: '新工单' },
  { value: 120, label: '等待客服回复' },
  { value: 160, label: '已回复用户' },
  { value: 220, label: '待用户确认' },
  { value: 250, label: '已解决' },
  { value: 280, label: '已关闭' },
];

export interface StatusSelectProps {
  value?: number[];
  onChange: (value: number[] | undefined) => void;
  disabled?: boolean;
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  return (
    <Select
      className="w-full"
      mode="multiple"
      showArrow
      placeholder="任何"
      options={options}
      optionFilterProp="label"
      value={value ?? undefined}
      onChange={(value) => onChange(value.length ? value : undefined)}
      disabled={disabled}
    />
  );
}
