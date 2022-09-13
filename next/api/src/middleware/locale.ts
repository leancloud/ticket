import { Context, Middleware } from 'koa';

declare module 'koa' {
  interface Context {
    locales?: string[];
  }
}

export const localeMiddleware: Middleware = (ctx, next) => {
  const locales = getLocalesFromQuery(ctx) || getLocalesFromHeader(ctx);
  if (locales) {
    ctx.locales = withFallbackLocale(locales);
  }
  return next();
};

function getLocalesFromQuery(ctx: Context) {
  const locale = ctx.query['locale'];
  if (locale !== undefined) {
    if (typeof locale === 'string') {
      return [locale.toLowerCase()];
    }
    return locale.map((l) => l.toLowerCase());
  }
}

const HEADER_LOCALE_PATTERN = /(?:^|,\s*)([a-zA-Z-]+)(?:;q=(\d+(?:\.\d+)?))?/g;

function getLocalesFromHeader(ctx: Context) {
  const locale = ctx.get('accept-language');
  if (locale) {
    const matchResult = locale.matchAll(HEADER_LOCALE_PATTERN);
    const pairs: [string, number][] = [];
    for (const result of matchResult) {
      const p = result[2] ? parseFloat(result[2]) : 1;
      pairs.push([result[1], p]);
    }
    pairs.sort((a, b) => b[1] - a[1]);
    return pairs.map((p) => p[0].toLowerCase());
  }
}

function withFallbackLocale(locales: string[]): string[] {
  const newLocales: string[] = [];
  locales.forEach((locale) => {
    newLocales.push(locale);
    const dashIndex = locale.indexOf('-');
    if (dashIndex !== -1) {
      newLocales.push(locale.slice(0, dashIndex));
    }
  });
  return newLocales;
}
