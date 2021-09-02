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
  value?: number[] | null;
  onChange: (value: number[] | null) => void;
}

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const handleSelect = (status: number) => {
    if (value) {
      onChange(value.concat(status));
    } else {
      onChange([status]);
    }
  };

  const handleDeselete = (status: number) => {
    if (value) {
      const filtered = value.filter((v) => v !== status);
      if (filtered.length) {
        onChange(filtered);
      } else {
        onChange(null);
      }
    }
  };

  return (
    <Select
      placeholder="任何"
      options={options}
      selected={value}
      onSelect={handleSelect}
      onDeselect={handleDeselete}
    />
  );
}
