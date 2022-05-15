import _ from 'lodash';

export const parseDateParam = (param?: string) => {
  if (param === undefined) return undefined;
  let date = new Date(Number(param));
  if (!isNaN(date.getTime())) {
    return date;
  }
  return new Date(param);
};

export const isTruthy = <T>(value: T | false | undefined | null | 0): value is T => !!value;
