import { LOCALES } from '@/i18n/locales';
import { z } from 'zod';
import * as yup from 'yup';

export const matchLocale = <T>(
  elements: T[],
  localeGetter: (elem: T) => string,
  locales: string[],
  defaultLocale: string
) => {
  const localesMap = new Map(locales.map((locale, index) => [locale, index + 1]));

  return elements.reduce<T | undefined>((prev, cur) => {
    if (!prev) {
      return cur;
    }

    const storedLocale = localeGetter(prev);
    const curLocale = localeGetter(cur);
    const curOptionPriority = localesMap.get(curLocale);
    const optionInStorePriority = localesMap.get(storedLocale);

    if (
      // override if cur option has priority but stored is not
      (!optionInStorePriority && curOptionPriority) ||
      // override if cur option has higher priority
      (curOptionPriority && optionInStorePriority && curOptionPriority < optionInStorePriority) ||
      // override if stored option has no priority and cur option's locale is default
      (!optionInStorePriority && curLocale === defaultLocale)
    ) {
      return cur;
    }

    return prev;
  }, undefined);
};

export const localeSchema = z
  .string()
  .transform((s) => s.toLowerCase())
  .superRefine((s, ctx) => {
    if (!LOCALES.includes(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_enum_value,
        options: LOCALES,
      });
    }
  });

export const localeSchemaForYup = yup
  .string()
  .transform((s: string) => s.toLowerCase())
  .test((s) => !!(s && LOCALES.includes(s)));
