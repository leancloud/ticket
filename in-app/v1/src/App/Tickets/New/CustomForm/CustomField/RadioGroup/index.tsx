import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useController, useFormContext } from 'react-hook-form';

import { Radio } from '@/components/Form';
import { CustomFieldProps } from '..';
import { ErrorMessage } from '../ErrorMessage';

export function RadioGroup({ id, required, options }: CustomFieldProps) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const {
    field: { ref, value, onChange },
    fieldState: { error },
  } = useController({
    control,
    name: id,
    rules: {
      required: {
        value: required,
        message: t('validation.required'),
      },
    },
  });

  const $container = useRef<HTMLDivElement>(null!);
  ref({
    focus: () => $container.current.scrollIntoView(),
  });

  return (
    <div ref={$container}>
      <div className="grid sm:grid-cols-2 gap-3">
        {options?.map((option) => (
          <div key={option.value} className="flex items-center break-all">
            <Radio fluid checked={value === option.value} onChange={() => onChange(option.value)}>
              {option.title}
            </Radio>
          </div>
        ))}
      </div>
      {error && <ErrorMessage className="mt-3">{error.message}</ErrorMessage>}
    </div>
  );
}
