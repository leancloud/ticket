export function getAvailableLocales(locale: string): string[] {
  const index = locale.indexOf('-');
  if (index > 0) {
    return [locale, locale.slice(0, index)];
  }
  return [locale];
}
