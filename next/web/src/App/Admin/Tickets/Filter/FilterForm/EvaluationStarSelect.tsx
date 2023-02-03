import { Select } from '@/components/antd';

const { Option } = Select;

export interface EvaluationStarSelectProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}

export function EvaluationStarSelect({ value, onChange, disabled }: EvaluationStarSelectProps) {
  return (
    <Select
      className="w-full"
      value={value?.toString() ?? ''}
      onChange={(v) => onChange(v ? parseInt(v) : undefined)}
      disabled={disabled}
    >
      <Option value="">全部</Option>
      <Option value="1">只看好评</Option>
      <Option value="0">只看差评</Option>
    </Select>
  );
}
