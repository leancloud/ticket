import { useMemo } from 'react';
import { Select, SelectProps } from 'antd';
import { DefaultOptionType } from 'antd/lib/select';
import _ from 'lodash';

import { TicketFieldSchema, TicketFieldType, useTicketFields } from '@/api/ticket-field';

const AvailableTypes: TicketFieldType[] = [
  'dropdown',
  /* 'multi-select', */
  'radios',
  'number',
  'text',
  'multi-line',
  /* 'date', */
];

export const OptionTypes: TicketFieldType[] = [
  'dropdown',
  'radios',
  /* 'multi-select', */
];

export const TextTypes: TicketFieldType[] = ['text', 'multi-line'];

export interface FieldSelectProps extends SelectProps<string> {
  onChangeWithData?: (field: TicketFieldSchema | undefined) => void;
  availableTypes?: TicketFieldType[];
}

export const FieldSelect = ({
  onChangeWithData,
  availableTypes,
  onChange,
  ...props
}: FieldSelectProps) => {
  const { data: fields } = useTicketFields({ unused: true, pageSize: 1000 });

  const fieldsIdMap = useMemo(() => _.keyBy(fields, (field) => field.id), [fields]);

  const options = useMemo(
    () =>
      fields
        ?.filter(({ type }) => (availableTypes ?? AvailableTypes).includes(type))
        .filter(({ meta }) => !meta?.hideFromSelect)
        .map(({ id, title, active, unused }) => ({
          label: active ? (unused ? `${title}（未使用）` : title) : `${title} (停用)`,
          value: id,
        })),
    [availableTypes, fields]
  );

  const handleChange = (id: string, option: DefaultOptionType | DefaultOptionType[]) => {
    onChange?.(id, option);
    onChangeWithData?.(fieldsIdMap[id]);
  };

  return (
    <Select
      className="w-full"
      options={options}
      allowClear
      placeholder="任何"
      onChange={handleChange}
      {...props}
    />
  );
};
