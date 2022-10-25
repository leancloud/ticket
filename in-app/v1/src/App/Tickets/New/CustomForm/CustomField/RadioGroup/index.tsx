import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useController, useFormContext } from 'react-hook-form';
import CheckIcon from '@/icons/Check';

import { CustomFieldProps } from '..';
import { Description } from '../Description';

export function RadioGroup({ id, description, options, required }: CustomFieldProps) {
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
    <>
      <div className="flex flex-col text-base text-left" ref={$container}>
        {options?.map((option) => (
          <button
            role="button"
            key={option.value}
            className="flex items-center justify-between py-3 text-left"
            onClick={(e) => {
              e.preventDefault();
              onChange(option.value);
            }}
          >
            <span className="flex-1 pr-[16px]">{option.title}</span>
            {value === option.value && <CheckIcon className="-ml-[8px] text-tapBlue h-3 w-3" />}
          </button>
        ))}
      </div>
      <Description error={error}>{description}</Description>
    </>
  );
}
