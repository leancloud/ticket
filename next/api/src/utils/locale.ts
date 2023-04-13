import { LOCALES } from '@/i18n/locales';
import { z } from 'zod';
import * as yup from 'yup';
import { match } from '@formatjs/intl-localematcher';
import { LangCodeISO6391 } from '@notevenaneko/whatlang-node';

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
  LangCodeISO6391.Zh,
  LangCodeISO6391.En,
  LangCodeISO6391.Ja,
  LangCodeISO6391.Ko,
  LangCodeISO6391.Id,
  LangCodeISO6391.Th,
  LangCodeISO6391.De,
  LangCodeISO6391.Fr,
  LangCodeISO6391.Ru,
  LangCodeISO6391.Es,
  LangCodeISO6391.Pt,
  LangCodeISO6391.Tr,
  LangCodeISO6391.Vi,
];
