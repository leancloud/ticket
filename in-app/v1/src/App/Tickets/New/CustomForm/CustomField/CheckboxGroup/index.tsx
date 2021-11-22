import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useController, useFormContext } from 'react-hook-form';

import { Checkbox } from '@/components/Form';
import { CustomFieldProps } from '..';
import { Description } from '../Description';

export function CheckboxGroup({ id, description, options, required }: CustomFieldProps) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const {
    field: { ref, value, onChange },
    fieldState: { error },
  } = useController<Record<string, string[] | undefined>>({
    control,
    name: id,
    rules: {
      required: {
        value: required,
        message: t('validation.required'),
      },
    },
  });

  const values = useMemo(() => new Set(value), [value]);
  const handleCheck = (checked: boolean, value: string) => {
    const nextValues = new Set(values);
    if (checked) {
      nextValues.add(value);
    } else {
      nextValues.delete(value);
    }
    onChange(Array.from(nextValues));
  };

  const $container = useRef<HTMLDivElement>(null!);
  ref({
    focus: () => $container.current.scrollIntoView(),
  });

  return (
    <div ref={$container}>
      <div className="grid sm:grid-cols-2 gap-3">
        {options?.map((option) => (
          <div key={option.value} className="flex items-center break-all">
            <Checkbox
              fluid
              checked={values.has(option.value)}
              onChange={(checked) => handleCheck(checked, option.value)}
            >
              {option.title}
            </Checkbox>
          </div>
        ))}
      </div>
      <Description className="mt-3" error={error}>
        {description}
      </Description>
    </div>
  );
}
