import { useCallback } from 'react';

import { Checkbox } from 'components/Form';
import { ErrorMessage } from '../ErrorMessage';

export interface Option {
  title: string;
  value: string;
}

export interface CheckboxGroupProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: Option[];
  error?: string;
}

export function CheckboxGroup({ options, value = [], onChange, error }: CheckboxGroupProps) {
  const handleChange = useCallback(
    (newValue: string, add: boolean) => {
      const value_set = new Set(value);
      if (add) {
        value_set.add(newValue);
      } else {
        value_set.delete(newValue);
      }
      onChange(Array.from(value_set));
    },
    [value, onChange]
  );

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-x-3">
        {options.map((option) => (
          <div key={option.value} className="flex items-center mb-3 break-all">
            <Checkbox
              fluid
              checked={value.includes(option.value)}
              onChange={(checked) => handleChange(option.value, checked)}
            >
              {option.title}
            </Checkbox>
          </div>
        ))}
      </div>
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}
