import { forwardRef, useMemo } from 'react';
import { DefaultOptionType, RefSelectProps } from 'antd/lib/select';

import { LOCALES } from '@/i18n/locales';
import { Select, SelectProps } from '@/components/antd';

export interface LocaleSelectProps extends Omit<SelectProps<any, DefaultOptionType>, 'onChange'> {
  hiddenLocales?: string[];
  locales?: Record<string, string>;
  hasUnknown?: boolean;
  unknownValue?: string;
  onChange?: (value: any, option: DefaultOptionType | DefaultOptionType[]) => void;
}

export const LocaleSelect = forwardRef<RefSelectProps, LocaleSelectProps>(
  ({ hiddenLocales, locales, hasUnknown, unknownValue, onChange, ...props }, ref) => {
    const showLocales = useMemo(
      () => [
        ...Object.entries(locales ?? LOCALES)
          .filter(([locale]) => !hiddenLocales?.some((hiddenLocale) => hiddenLocale === locale))
          .map(([locale, label]) => ({ label, value: locale })),
        ...(hasUnknown ? [{ label: '(未知)', value: unknownValue ?? 'null' }] : []),
      ],
      [hiddenLocales, locales, hasUnknown, unknownValue]
    );

    return (
      <Select
        {...props}
        ref={ref}
        options={showLocales}
        onChange={(v, o) => onChange?.(v?.length ? v : undefined, o)}
      />
    );
  }
);
