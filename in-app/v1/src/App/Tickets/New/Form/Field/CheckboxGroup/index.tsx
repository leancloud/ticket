import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';

import { Checkbox } from '@/components/Form';
import { ErrorMessage } from '../ErrorMessage';
import { ControlRef } from '..';

export interface Option {
  title: string;
  value: string;
}

export interface CheckboxGroupProps {
  onChange: (value?: string[]) => void;
  options: Option[];
  error?: string;
}

export const CheckboxGroup = forwardRef<ControlRef, CheckboxGroupProps>(
  ({ options, onChange, error }, ref) => {
    const $container = useRef<HTMLDivElement>(null!);
    const [values, setValues] = useState(new Set<string>());

    const handleChange = useCallback(
      (newValue: string, add: boolean) => {
        const nextValues = new Set(values);
        if (add) {
          nextValues.add(newValue);
        } else {
          nextValues.delete(newValue);
        }
        onChange(nextValues.size ? Array.from(nextValues) : undefined);
        setValues(nextValues);
      },
      [values, onChange]
    );

    useImperativeHandle(ref, () => ({
      focus: () => $container.current.scrollIntoView(),
    }));

    return (
      <div>
        <div className="grid sm:grid-cols-2 gap-x-3">
          {options.map((option) => (
            <div key={option.value} className="flex items-center mb-3 break-all">
              <Checkbox
                fluid
                checked={values.has(option.value)}
                onChange={(checked) => handleChange(option.value, checked)}
              >
                {option.title}
              </Checkbox>
            </div>
          ))}
        </div>
        <ErrorMessage className="mt-1">{error}</ErrorMessage>
      </div>
    );
  }
);
