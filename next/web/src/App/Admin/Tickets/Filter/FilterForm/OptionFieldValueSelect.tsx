import { useTicketField } from '@/api/ticket-field';
import { SelectProps, Select } from 'antd';
import { DefaultOptionType } from 'antd/lib/select';
import { useMemo } from 'react';

export interface OptionFieldValueSelectProps extends SelectProps<string> {
  fieldId: string;
}

export const OptionFieldValueSelect = ({ fieldId, ...props }: OptionFieldValueSelectProps) => {
  const { data: field } = useTicketField(fieldId);

  const options = useMemo<DefaultOptionType[] | undefined>(
    () =>
      field?.variants
        ?.find(({ locale }) => locale === field.defaultLocale)
        ?.options?.map(({ value, title }) => ({ label: title, value })),
    [field]
  );

  return <Select className="w-full" options={options} allowClear placeholder="任何" {...props} />;
};
