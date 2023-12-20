import { ComponentPropsWithoutRef } from 'react';

function addZeroPrefix(value: number, width: number): string {
  const str = value + '';
  if (str.length >= width) {
    return str;
  }
  return '0'.repeat(width - str.length) + str;
}

export interface TimeProps extends ComponentPropsWithoutRef<'span'> {
  value: Date;
}

export function Time({ value, ...props }: TimeProps) {
  const year = value.getFullYear();
  const month = addZeroPrefix(value.getMonth() + 1, 2);
  const date = addZeroPrefix(value.getDate(), 2);
  const hour = addZeroPrefix(value.getHours(), 2);
  const minute = addZeroPrefix(value.getMinutes(), 2);
  const second = addZeroPrefix(value.getSeconds(), 2);
  return <span {...props}>{`${year}-${month}-${date} ${hour}:${minute}:${second}`}</span>;
}
