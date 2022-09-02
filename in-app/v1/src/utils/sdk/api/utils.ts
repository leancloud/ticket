import { callHandler, registerHandler } from '../webView';

const supportMethods: { [key: string]: boolean } = {};

async function checkSupport(name: string): Promise<Boolean> {
  if (supportMethods[name] !== undefined) {
    return Promise.resolve(supportMethods[name]);
  }
  return new Promise((resolve, reject) => {
    try {
      callHandler('_hasNativeMethod', name, function (res) {
        supportMethods[name] = res;
        resolve(res);
      });
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
      return reject(new Error(`${name} is not support`));
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
