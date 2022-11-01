import { callHandlerPromise } from './utils';
import { registerHandler } from '../webView';
import { utf8_to_b64 } from '@/utils/base64';
export * from './button';

export interface DiviceInfo {
  SR: string; //屏幕分辨率
  PLT: 'Android' | 'iOS'; //平台
  VERSION_CODE: string | number; //SDK 版本
  NOTCH: boolean; //是否有刘海
  ORIENTATION: 1 | 2; //1 竖屏  2 横屏
  SDK_LANG: string; //当前语言
  NETWORK_TYPE:
    | 2 //  wifi
    | 3 //  GPRS
    | 4 // CDMA
    | 5 //  EDGE
    | 10; //  LTE
}

export const closePage = () => callHandlerPromise('_closePage');

export const loadComplete = () => callHandlerPromise('loadComplete');

export const openInBrowser = (url: string) => callHandlerPromise('openBrowser', utf8_to_b64(url));

export const getDeviceInfo = () => callHandlerPromise<DiviceInfo>('getDeviceInfo');

// register event
export const onDeviceStatusChange = (callBack: (info: DiviceInfo) => void) =>
  registerHandler('deviceStatusDidChange', callBack);
