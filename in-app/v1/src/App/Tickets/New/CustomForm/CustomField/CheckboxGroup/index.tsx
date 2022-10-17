import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useController, useFormContext } from 'react-hook-form';
import classNames from 'classnames';
import CheckIcon from '@/icons/Check';
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
    <>
      <div className="flex flex-col text-base" ref={$container}>
        {options?.map((option) => {
          const checked = values.has(option.value);
          return (
            <button
              key={option.value}
              className="flex items-center justify-between py-3 text-left"
              onClick={(e) => {
                e.preventDefault();
                handleCheck(!checked, option.value);
              }}
            >
              <span>
                <div
                  className={classNames(
                    'flex w-4 h-4 rounded-full',
                    checked ? 'bg-tapBlue' : 'border border-color-[#B9BEC1]'
                  )}
                >
                  <CheckIcon className="w-2 h-2 m-auto text-white" />
                </div>
              </span>
              <span className="ml-2 flex-1">{option.title}</span>
            </button>
          );
        })}
      </div>
      <Description error={error}>{description}</Description>
    </>
  );
}
