import { LOCALES } from '@/i18n/locales';
import { Select, SelectProps } from 'antd';
import { FC, useMemo } from 'react';

export interface LocaleSelectProps extends SelectProps {
  hiddenLocales?: string[];
}

export const LocaleSelect: FC<LocaleSelectProps> = ({ hiddenLocales, ...props }) => {
  const showLocales = useMemo(
    () =>
      Object.entries(LOCALES)
        .filter(([locale]) => !hiddenLocales?.some((hiddenLocale) => hiddenLocale === locale))
        .map(([locale, label]) => ({ label, value: locale })),
    [hiddenLocales]
  );

  return <Select {...props} options={showLocales} />;
};
