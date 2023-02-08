import { TicketFieldType, useTicketFields } from '@/api/ticket-field';
import { TreeSelect } from 'antd';
import { FC, useCallback, useMemo } from 'react';

const OptionTypes: TicketFieldType[] = ['dropdown', /* 'multi-select', */ 'radios'];

export interface FieldOption {
  name?: string;
  value?: string;
}

export interface FieldSelectProps {
  value?: FieldOption;
  onChange?: (value: FieldOption) => void;
  disabled?: boolean;
}

export const FieldSelect: FC<FieldSelectProps> = ({ value, onChange, disabled }) => {
  const { data: fields } = useTicketFields({ includeVariants: true, used: true, pageSize: 1000 });

  const treeData = useMemo(
    () =>
      fields
        ?.filter(({ type }) => OptionTypes.includes(type))
        .map(({ id, title, variants, defaultLocale, active }) => ({
          selectable: false,
          title: active ? title : `${title} (停用)`,
          value: id,
          children: variants
            ?.find(({ locale }) => locale === defaultLocale)
            ?.options?.map(({ value, title }) => ({ title, value: `${id}:${value}` })),
        })),
    [fields]
  );

  const handleChange = useCallback(
    (v?: string) => {
      const field = v?.split(':');
      onChange?.({ name: field?.[0], value: field?.[1] });
    },
    [onChange]
  );

  return (
    <TreeSelect
      className="w-full"
      value={value && `${value.name}:${value.value}`}
      onChange={handleChange}
      treeData={treeData}
      disabled={disabled}
      allowClear
      placeholder="任何"
    />
  );
};
