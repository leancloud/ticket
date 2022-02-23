import { Select } from '@/components/antd';

const { Option } = Select;

export interface EvaluationStarSelectProps {
  value?: number;
  onChange: (value: number | undefined) => void;
}

export function EvaluationStarSelect({ value, onChange }: EvaluationStarSelectProps) {
  return (
    <Select
      className="w-full"
      value={value?.toString() ?? ''}
      onChange={(v) => onChange(v ? parseInt(v) : undefined)}
    >
      <Option value="">全部</Option>
      <Option value="1">只看好评</Option>
      <Option value="0">只看差评</Option>
    </Select>
  );
}
