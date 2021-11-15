import _ from 'lodash';

export const parseDateParam = (param?: string) => {
  if (param === undefined) return undefined;
  let date = new Date(Number(param));
  if (!isNaN(date.getTime())) {
    return date;
  }
  return new Date(param);
};
