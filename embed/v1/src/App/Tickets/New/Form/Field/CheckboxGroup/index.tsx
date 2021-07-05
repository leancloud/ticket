import { Checkbox } from 'components/Form';

export interface CheckboxGroupProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  error?: string;
}

export function CheckboxGroup({ options, value = [], onChange, error }: CheckboxGroupProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-x-3">
      {options.map((option) => (
        <div key={option} className="flex items-center mb-3 break-all">
          <Checkbox
            checked={value.includes(option)}
            onChange={(checked) =>
              onChange(checked ? value.concat(option) : value.filter((v) => v !== option))
            }
          >
            {option}
          </Checkbox>
        </div>
      ))}
    </div>
  );
}
