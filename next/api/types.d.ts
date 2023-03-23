import * as koa from 'koa';
import { ILocale } from './src/middleware/locale';

declare module 'koa' {
  interface DefaultContext {
    locales: ILocale;
  }
}
