declare global {
  interface Window {
    WVJBCallbacks?: any[];
    WebViewJavascriptBridge?: Bridge;
    closePage?: () => void;
    webViewJavascriptInterface?: {
      notice: (message: string) => void;
    };
  }
}

type RegisterHandler = (
  name: string,
  handler: (name: string, callback?: () => void) => void
) => void;
type CallHandler = (
  name: string,
  params?: object | string | boolean,
  callback?: (data: any) => void
) => void;

type Bridge = AndroidBridge | IOSBridge | BridgeHandler;

interface BridgeHandler {
  registerHandler: RegisterHandler;
  callHandler: CallHandler;
}

interface AndroidBridge extends BridgeHandler {
  disableJavascriptAlertBoxSafetyTimeout: (disable: boolean) => void;
  _handleMessageFromJava: (message: { [key: string]: any }) => void;
  hasNativeMethod: (name: string, callBack: Parameters<CallHandler>[2]) => void;
}

interface IOSBridge extends BridgeHandler {
  disableJavscriptAlertBoxSafetyTimeout: () => void;
  _handleMessageFromObjC: (message: string) => void;
  _fetchQueue: () => void;
}

const bridgeConfig = {
  callHandle: {}, // bridge android / ios
  silent: false,
};

let $bridge: Bridge = {
  registerHandler: function (name: string) {
    if (bridgeConfig.silent) {
      console.error(name, ' register handler failure');
    }
  },
  callHandler: function (name: string) {
    if (bridgeConfig.silent) {
      console.error(name, ' call handler webView failure');
    }
  },
};

function createWebViewJavascriptBridge() {
  const messageHandlers: { [key: string]: Parameters<RegisterHandler>[1] } = {};
  const responseCallbacks: { [key: string]: any } = {};
  let uniqueId = 1;

  const bridge: AndroidBridge = {
    registerHandler: (handlerName, handler) => {
      messageHandlers[handlerName] = handler;
    },
    callHandler: function (handlerName: string, data?: any, responseCallback?: any) {
      if (arguments.length == 2 && typeof data == 'function') {
        responseCallback = data;
        data = null;
      }
      _doSend(
        {
          handlerName: handlerName,
          data: data,
        },
        responseCallback
      );
    },
    disableJavascriptAlertBoxSafetyTimeout: function (disable: boolean) {
      this.callHandler('_disableJavascriptAlertBoxSafetyTimeout', disable !== false);
    },
    _handleMessageFromJava: function (message) {
      _dispatchMessageFromJava(message);
    },
    hasNativeMethod: function (name, responseCallback) {
      this.callHandler('_hasNativeMethod', name, responseCallback);
    },
  };

  function _dispatchMessageFromJava(message: { [key: string]: any }) {
    let responseCallback;
    if (message.responseId) {
      responseCallback = responseCallbacks[message.responseId];
      if (!responseCallback) {
        return;
      }
      responseCallback(message.responseData);
      delete responseCallbacks[message.responseId];
    } else {
      if (message.callbackId) {
        const callbackResponseId = message.callbackId;
        responseCallback = (responseData: any) => {
          _doSend({
            handlerName: message.handlerName,
            responseId: callbackResponseId,
            responseData: responseData,
          });
        };
      }
    }
  }

  function _doSend(message: { [key: string]: any }, responseCallBack?: any) {
    if (responseCallBack) {
      const callbackId = `cb_${uniqueId++}_${Date.now()}`;
      responseCallbacks[callbackId] = responseCallBack;
      message['callbackId'] = callbackId;
    }
    window.webViewJavascriptInterface?.notice?.(JSON.stringify(message || {}));
  }

  bridge.registerHandler('_hasJavascriptMethod', function (data: any, responseCallback: any) {
    responseCallback(!!messageHandlers[data]);
  });

  const callbacks = window.WVJBCallbacks;
  delete window.WVJBCallbacks;
  if (callbacks) {
    for (var i = 0; i < callbacks.length; i++) {
      callbacks[i](bridge);
    }
  }
  window.WebViewJavascriptBridge = bridge;

  // TODO
  window.closePage = function () {
    bridge.callHandler('_closePage');
  };
}

function createIosWebViewJavascriptBridge() {
  if (window.WebViewJavascriptBridge) {
    return;
  }

  let sendMessageQueue: any[] = [];
  let uniqueId = 1;
  let dispatchMessagesWithTimeoutSafety = true;

  const messageHandlers: { [key: string]: any } = {};
  const CUSTOM_PROTOCOL_SCHEME = 'https';
  const QUEUE_HAS_MESSAGE = '__wvjb_queue_message__';
  const responseCallbacks: { [key: string]: any } = {};

  const messagingIframe = document.createElement('iframe');
  messagingIframe.style.display = 'none';
  messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE;
  document.documentElement.appendChild(messagingIframe);

  setTimeout(_callWVJBCallbacks, 0);

  function _callWVJBCallbacks() {
    var callbacks = window.WVJBCallbacks;
    delete window.WVJBCallbacks;
    if (!callbacks) {
      return;
    }
    for (var i = 0; i < callbacks.length; i++) {
      callbacks[i](window.WebViewJavascriptBridge);
    }
  }

  const registerHandler: RegisterHandler = (handlerName, handler) => {
    messageHandlers[handlerName] = handler;
  };

  registerHandler('_disableJavascriptAlertBoxSafetyTimeout', disableJavscriptAlertBoxSafetyTimeout);

  function _handleMessageFromObjC(messageJSON: string) {
    _dispatchMessageFromObjC(messageJSON);
  }

  function callHandler(handlerName: string, data?: any, responseCallback?: any) {
    if (arguments.length == 2 && typeof data == 'function') {
      responseCallback = data;
      data = null;
    }
    _doSend({ handlerName: handlerName, data: data }, responseCallback);
  }

  function disableJavscriptAlertBoxSafetyTimeout() {
    dispatchMessagesWithTimeoutSafety = false;
  }

  function _doSend(message: { [key: string]: any }, responseCallback?: any) {
    if (responseCallback) {
      const callbackId = `cb_${uniqueId++}_${Date.now()}`;
      responseCallbacks[callbackId] = responseCallback;
      message['callbackId'] = callbackId;
      // reportInfo(['SDKVendor', 'call', 'ios'], JSON.stringify(message || {}));
    }
    sendMessageQueue.push(message);
    messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE;
  }

  function _fetchQueue() {
    var messageQueueString = JSON.stringify(sendMessageQueue);
    sendMessageQueue = [];
    return messageQueueString;
  }

  function _dispatchMessageFromObjC(messageJSON: string) {
    if (dispatchMessagesWithTimeoutSafety) {
      setTimeout(_doDispatchMessageFromObjC);
    } else {
      _doDispatchMessageFromObjC();
    }

    function _doDispatchMessageFromObjC() {
      const message = JSON.parse(messageJSON);
      let responseCallback;

      if (message.responseId) {
        responseCallback = responseCallbacks[message.responseId];
        if (!responseCallback) {
          return;
        }
        responseCallback(message.responseData);
        delete responseCallbacks[message.responseId];
      } else {
        if (message.callbackId) {
          var callbackResponseId = message.callbackId;
          responseCallback = function (responseData: any) {
            _doSend({
              handlerName: message.handlerName,
              responseId: callbackResponseId,
              responseData: responseData,
            });
          };
        }

        var handler = messageHandlers[message.handlerName];
        if (!handler) {
          console.error(
            'WebViewJavascriptBridge: WARNING: no handler for message from ObjC:',
            message
          );
        } else {
          handler(message.data, responseCallback);
        }
      }
    }
  }

  const bridge: IOSBridge = {
    registerHandler,
    callHandler,
    disableJavscriptAlertBoxSafetyTimeout,
    _fetchQueue,
    _handleMessageFromObjC,
  };

  window.WebViewJavascriptBridge = bridge;
}

// ============ device init operation start ===========
/* setup WebView Javascript Bridge for ios , ios 初始化 */
function setupWebViewJavascriptBridge(callback: (b: Bridge) => void) {
  if (window.WebViewJavascriptBridge) {
    return callback(window.WebViewJavascriptBridge);
  } else {
    createIosWebViewJavascriptBridge();
    callback(window.WebViewJavascriptBridge!);
  }
  if (window.WVJBCallbacks) {
    return window.WVJBCallbacks.push(callback);
  }
  window.WVJBCallbacks = [callback];
  const WVJBIframe = document.createElement('iframe');
  WVJBIframe.style.display = 'none';
  WVJBIframe.src = 'wvjbscheme://__BRIDGE_LOADED__';
  document.documentElement.appendChild(WVJBIframe);
  setTimeout(function () {
    document.documentElement.removeChild(WVJBIframe);
  }, 0);
}

/* 用于创建桥接对象的函数 , android 初始化 */
function connectWebViewJavascriptBridge(callback: (b: Bridge) => void) {
  //如果桥接对象已存在，则直接调用callback函数
  if (window.WebViewJavascriptBridge) {
    callback(window.WebViewJavascriptBridge);
  }
  //否则添加一个监听器来执行callback函数
  else {
    //改为自己创建
    createWebViewJavascriptBridge();
    callback(window.WebViewJavascriptBridge!);
    // document.addEventListener('WebViewJavascriptBridgeReady', function () {
    //   callback(WebViewJavascriptBridge)
    // }, false)
  }
}

/* device detect for ios/android */

try {
  var ua =
    'userAgentData' in navigator ? (navigator as any).userAgentData.platform : navigator.userAgent;

  if (/(iPhone|iPad|iPod|iOS)/i.test(ua)) {
    setupWebViewJavascriptBridge(function (bridge) {
      $bridge = bridge;
    });
  } else if (/(Android)/i.test(ua)) {
    connectWebViewJavascriptBridge(function (bridge) {
      $bridge = bridge;
    });
  }
  // else {
  //   setupWebViewJavascriptBridge(function (bridge: any) {
  //     $bridge = bridge;
  //   });
  // }
} catch (e) {
  console.log(e);
}

/**
 * Android / IOS 调用JS,需要明确调用的`function名称` .
 * @param name `function name`
 * @param registerCallback 回调的响应事件
 */
export const registerHandler: RegisterHandler = function (name, registerCallback) {
  if ($bridge['registerHandler']) {
    $bridge.registerHandler(name, function (data: any) {
      if (typeof data === 'string') {
        // 尝试转json
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.log(e);
        }
      }
      registerCallback(data);
    });
  } else {
    console.error("Don't built-in WebView invoking ", name, '{registerHandler}');
  }
};

/**
 *  JS 调用 Android / IOS
 *
 *  name: 回调名称, android/ios 名称 ,eg: 'getUserInfo'
 *  params 请求参数, eg: { 'userId' : 1}
 *  callback: response(响应函数)
 *
 *  eg: this.$bridge.callHandler('getUserInfo',{'userId':1},function(data){...})
 *
 */
export const callHandler: CallHandler = function (name, params, callback) {
  if ($bridge['callHandler']) {
    $bridge.callHandler(name, params, function (data) {
      if (typeof callback == 'function') {
        if (typeof data === 'string') {
          // 尝试转json
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.log(e);
          }
        }
        callback(data);
      }
    });
  } else {
    console.error("Don't built-in WebView invoking ", name, '{callHandler}');
  }
};
