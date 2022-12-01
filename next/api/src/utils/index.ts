import { Context } from 'koa';
import _ from 'lodash';

export const parseDateParam = (param?: string) => {
  if (param === undefined) return undefined;
  let date = new Date(Number(param));
  if (!isNaN(date.getTime())) {
    return date;
  }
  return new Date(param);
};

export const getIP = (ctx: Context) => {
  const realIP = ctx.headers['x-real-ip'];
  if (_.isString(realIP)) return realIP;
  if (_.isArray(realIP)) return realIP[0];
  return ctx.ip;
};
