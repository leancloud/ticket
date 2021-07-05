import { Radio } from 'components/Form/Radio';

export interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  error?: string;
}

export function RadioGroup({ options, value, onChange, error }: RadioGroupProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {options.map((option) => (
        <div key={option} className="flex items-center break-all">
          <Radio checked={value === option} onChange={() => onChange(option)}>
            {option}
          </Radio>
        </div>
      ))}
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}
