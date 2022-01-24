import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { Radio } from '@/components/Form/Radio';
import { ControlRef } from '..';
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

export const RadioGroup = forwardRef<ControlRef, RadioGroupProps>(
  ({ options, onChange, error }, ref) => {
    const $container = useRef<HTMLDivElement>(null!);
    const [value, setValue] = useState<string>();

    useImperativeHandle(ref, () => ({
      focus: () => $container.current.focus(),
    }));

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
);
