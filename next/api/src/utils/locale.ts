import { LOCALES } from '@/i18n/locales';
import { z } from 'zod';
import * as yup from 'yup';
import { match } from '@formatjs/intl-localematcher';

export const localeMatcherFactory = (requestedLocales: string[]) => (
  availableLocales: string[],
  defaultLocale: string
) => match(requestedLocales, availableLocales, defaultLocale, { algorithm: 'best fit' });

export type LocaleMatcher = ReturnType<typeof localeMatcherFactory>;

export const matchLocale = <T>(
  elements: T[],
  localeGetter: (elem: T) => string,
  matcher: LocaleMatcher,
  defaultLocale: string
) => {
  const res = matcher(elements.map(localeGetter), defaultLocale);

  return elements.find((t) => localeGetter(t) === res);
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

export const allowedTicketLanguages = [
  'zh',
  'zh-Hans',
  'zh-Hant',
  'en',
  'ja',
  'ko',
  'id',
  'th',
  'de',
  'fr',
  'ru',
  'es',
  'pt',
  'tr',
  'vi',
  'ar',
];
