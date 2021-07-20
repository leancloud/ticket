import { useState } from 'react';

import { Radio } from 'components/Form/Radio';
import { ErrorMessage } from '../ErrorMessage';

export interface RadioOption {
  title: string;
  value: string;
}

export interface RadioGroupProps {
  onChange: (value: string) => void;
  options: RadioOption[];
  error?: string;
}

export function RadioGroup({ options, onChange, error }: RadioGroupProps) {
  const [value, setValue] = useState<string>();

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((option) => (
          <div key={option.value} className="flex items-center break-all">
            <Radio
              fluid
              checked={value === option.value}
              onChange={() => {
                setValue(option.value);
                onChange(option.value);
              }}
            >
              {option.title}
            </Radio>
          </div>
        ))}
      </div>
      <ErrorMessage className="mt-1">{error}</ErrorMessage>
    </div>
  );
}
