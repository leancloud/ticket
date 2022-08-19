import { callHandler, registerHandler } from './webView';

const supportMap: { [key: string]: boolean } = {};

async function checkSupport(name: string): Promise<Boolean> {
  if (supportMap[name] !== undefined) {
    return Promise.resolve(supportMap[name]);
  }
  return new Promise((resolve, reject) => {
    try {
      callHandler('_hasNativeMethod', name, function (res) {
        supportMap[name] = (res as unknown) as boolean;
      });
      resolve(supportMap[name]);
    } catch (error) {
      reject(error);
    }
  });
}

async function callHandlerPromise<Response = void, Payload = any>(
  name: string,
  payload?: Payload
): Promise<Response> {
  return new Promise<Response>(async (resolve, reject) => {
    // await checkSupport(name);
    try {
      callHandler(name, payload ?? {}, function (res) {
        resolve(res as Response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export const closePage = () => callHandlerPromise('_closePage');

export const loadComplete = () => callHandlerPromise('loadComplete');

export const showCloseButton = () => callHandlerPromise('showCloseButton');

export const hideCloseButton = () => callHandlerPromise('hideCloseButton');

export const openBrowser = (url: string) => callHandlerPromise('openBrowser', url);
