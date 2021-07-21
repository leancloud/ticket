import { memo } from 'react';

const CHINESE_REGEX = /[\u4E00-\u9FA5]+/;

// @ts-ignore
export const SpaceChinese = memo(({ children }: { children: string }) => {
  if (children.length === 2 && CHINESE_REGEX.test(children)) {
    return children.split('').join(' ');
  }
  return children;
});
