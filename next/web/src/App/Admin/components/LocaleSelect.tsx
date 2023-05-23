import { forwardRef, useMemo } from 'react';
import { RefSelectProps } from 'antd/lib/select';

import { LOCALES } from '@/i18n/locales';
import { Select, SelectProps } from '@/components/antd';

export interface LocaleSelectProps extends SelectProps {
  hiddenLocales?: string[];
  locales?: Record<string, string>;
  hasUnknown?: boolean;
  unknownValue?: string;
}

export const LocaleSelect = forwardRef<RefSelectProps, LocaleSelectProps>(
  ({ hiddenLocales, locales, hasUnknown, unknownValue, ...props }, ref) => {
    const showLocales = useMemo(
      () => [
        ...Object.entries(locales ?? LOCALES)
          .filter(([locale]) => !hiddenLocales?.some((hiddenLocale) => hiddenLocale === locale))
          .map(([locale, label]) => ({ label, value: locale })),
        ...(hasUnknown ? [{ label: '(未知)', value: unknownValue ?? 'null' }] : []),
      ],
      [hiddenLocales, locales, hasUnknown, unknownValue]
    );

    return <Select {...props} ref={ref} options={showLocales} />;
  }
);
