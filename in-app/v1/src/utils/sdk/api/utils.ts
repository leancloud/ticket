import { callHandler, registerHandler } from '../webView';

const supportMethods: { [key: string]: boolean } = {};

export const _hasNativeMethod = (name: string) => callHandlerPromise('_hasNativeMethod', name);

export async function checkSupport(name: string): Promise<Boolean> {
  if (supportMethods[name] !== undefined) {
    return Promise.resolve(supportMethods[name]);
  }
  return new Promise((resolve, reject) => {
    try {
      callHandler('_hasNativeMethod', name, function (res) {
        supportMethods[name] = !!res.responseData;
      });
      resolve(supportMethods[name]);
    } catch (error) {
      supportMethods[name] = false;
      reject(error);
    }
  });
}

export async function callHandlerPromise<Response = void, Payload = any>(
  name: string,
  payload?: Payload
): Promise<Response> {
  return new Promise<Response>(async (resolve, reject) => {
    const isSupport = await checkSupport(name);
    if (!isSupport) {
      console.log(`${name} is not support`);
      reject(new Error(`${name} is not support`));
    }
    try {
      callHandler(name, payload ?? {}, function (res) {
        resolve(res as Response);
      });
    } catch (error) {
      reject(error);
    }
  });
}
