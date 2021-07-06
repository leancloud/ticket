import { Radio } from 'components/Form/Radio';
import { ErrorMessage } from '../ErrorMessage';

export interface RadioOption {
  title: string;
  value: string;
}

export interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  error?: string;
}

export function RadioGroup({ options, value, onChange, error }: RadioGroupProps) {
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((option) => (
          <div key={option.value} className="flex items-center break-all">
            <Radio fluid checked={value === option.value} onChange={() => onChange(option.value)}>
              {option.title}
            </Radio>
          </div>
        ))}
      </div>
      <ErrorMessage className="mt-1">{error}</ErrorMessage>
    </div>
  );
}
