import { callHandlerPromise } from './utils';
import { utf8_to_b64 } from '@/utils/base64';
export * from './button';

export const closePage = () => callHandlerPromise('_closePage');

export const loadComplete = () => callHandlerPromise('loadComplete');

export const openInBrowser = (url: string) => callHandlerPromise('openBrowser', utf8_to_b64(url));
