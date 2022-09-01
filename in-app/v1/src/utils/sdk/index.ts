export * from './api';
export * from './webView';
import { loadComplete } from './api';

export const isInit = !!window.webViewJavascriptInterface;

export const initSDK = async () => {
  if (!isInit) {
    return;
  }
  loadComplete();
};
