import { NULL_STRING } from '@/components/antd';
import { TicketLanguages } from '@/i18n/locales';
import { Select, SelectProps } from 'antd';
import { useMemo } from 'react';

export const LanguageSelect = ({ value, onChange, ...props }: SelectProps) => {
  const showLocales = useMemo(
    () => [
      ...Object.entries(TicketLanguages).map(([locale, label]) => ({ label, value: locale })),
      { label: '(未知)', value: NULL_STRING },
    ],
    []
  );

  return (
    <Select
      {...props}
      value={value === null ? NULL_STRING : value}
      onChange={(value, option) => onChange?.(value === NULL_STRING ? null : value, option)}
      options={showLocales}
    />
  );
};
