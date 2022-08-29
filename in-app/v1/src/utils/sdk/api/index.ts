import { callHandlerPromise } from './utils';
export * from './button';

export const closePage = () => callHandlerPromise('_closePage');

export const loadComplete = () => callHandlerPromise('loadComplete');

export const openBrowser = (url: string) =>
  callHandlerPromise('openBrowser', encodeURIComponent(url));
