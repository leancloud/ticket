/**
 * Vue Bridge Webview v1.0
 * https://github.com/cmp-cc/vue-bridge-webview
 *
 * Copyright 2016, cmp-cc
 * Released under the MIT license
 */
/* eslint-disable */

function createWebViewJavascriptBridge() {
  var messageHandlers = {};
  var responseCallbacks = {};
  var uniqueId = 1;
  var dispatchMessagesWithTimeoutSafety = true;
  var random = 1;

  function _doSend(message, responseCallback) {
    if (responseCallback) {
      var callbackId = 'cb_' + uniqueId++ + '_' + new Date().getTime();
      responseCallbacks[callbackId] = responseCallback;
      message['callbackId'] = callbackId;
      // reportInfo(['SDKVendor', 'call', 'android'], JSON.stringify(message || {}));
    }
    window.webViewJavascriptInterface?.notice?.(JSON.stringify(message || {}));
  }

  var bridge = {
    registerHandler: function (handlerName, handler) {
      messageHandlers[handlerName] = handler;
    },

    callHandler: function (handlerName, data, responseCallback) {
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
    disableJavascriptAlertBoxSafetyTimeout: function (disable) {
      this.callHandler('_disableJavascriptAlertBoxSafetyTimeout', disable !== false);
    },
    _handleMessageFromJava: function (messageJSON) {
      _dispatchMessageFromJava(messageJSON);
    },
    hasNativeMethod: function (name, responseCallback) {
      this.callHandler('_hasNativeMethod', name, responseCallback);
    },
  };

  bridge.registerHandler('_hasJavascriptMethod', function (data, responseCallback) {
    responseCallback(!!messageHandlers[data]);
  });

  function _dispatchMessageFromJava(message) {
    var messageHandler;
    var responseCallback;
    if (message.responseId) {
      responseCallback = responseCallbacks[message.responseId];
      if (!responseCallback) {
        console.log(`callback not exist`, JSON.stringify(message));
        return;
      }
      responseCallback(message.responseData);
      delete responseCallbacks[message.responseId];
    } else {
      if (message.callbackId) {
        var callbackResponseId = message.callbackId;
        responseCallback = function (responseData) {
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
          'WebViewJavascriptBridge: WARNING: no handler for message from java',
          message
        );
      } else {
        handler(message.data, responseCallback);
      }
    }
  }

  var callbacks = window.WVJBCallbacks;
  delete window.WVJBCallbacks;
  if (callbacks) {
    for (var i = 0; i < callbacks.length; i++) {
      callbacks[i](bridge);
    }
  }
  window.WebViewJavascriptBridge = bridge;

  window.close = function () {
    bridge.callHandler('_closePage');
  };
}

function createIosWebViewJavascriptBridge() {
  if (window.WebViewJavascriptBridge) {
    return;
  }

  if (!window.onerror) {
    window.onerror = function (msg, url, line) {
      console.error(`WebViewJavascriptBridge: ERROR:${msg}@${url}:${line}`);
    };
  }
  window.WebViewJavascriptBridge = {
    registerHandler: registerHandler,
    callHandler: callHandler,
    disableJavscriptAlertBoxSafetyTimeout: disableJavscriptAlertBoxSafetyTimeout,
    _fetchQueue: _fetchQueue,
    _handleMessageFromObjC: _handleMessageFromObjC,
  };

  var messagingIframe;
  var sendMessageQueue = [];
  var messageHandlers = {};

  var CUSTOM_PROTOCOL_SCHEME = 'https';
  var QUEUE_HAS_MESSAGE = '__wvjb_queue_message__';

  var responseCallbacks = {};
  var uniqueId = 1;
  var dispatchMessagesWithTimeoutSafety = true;

  function registerHandler(handlerName, handler) {
    messageHandlers[handlerName] = handler;
  }

  function callHandler(handlerName, data, responseCallback) {
    if (arguments.length == 2 && typeof data == 'function') {
      responseCallback = data;
      data = null;
    }
    _doSend({ handlerName: handlerName, data: data }, responseCallback);
  }

  function disableJavscriptAlertBoxSafetyTimeout() {
    dispatchMessagesWithTimeoutSafety = false;
  }

  function _doSend(message, responseCallback) {
    if (responseCallback) {
      var callbackId = 'cb_' + uniqueId++ + '_' + new Date().getTime();
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

  function _dispatchMessageFromObjC(messageJSON) {
    if (dispatchMessagesWithTimeoutSafety) {
      setTimeout(_doDispatchMessageFromObjC);
    } else {
      _doDispatchMessageFromObjC();
    }

    function _doDispatchMessageFromObjC() {
      var message = JSON.parse(messageJSON);
      var messageHandler;
      var responseCallback;

      if (message.responseId) {
        responseCallback = responseCallbacks[message.responseId];
        if (!responseCallback) {
          console.log(`callback not exist`, JSON.stringify(message));
          return;
        }
        responseCallback(message.responseData);
        delete responseCallbacks[message.responseId];
      } else {
        if (message.callbackId) {
          var callbackResponseId = message.callbackId;
          responseCallback = function (responseData) {
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

  function _handleMessageFromObjC(messageJSON) {
    _dispatchMessageFromObjC(messageJSON);
  }

  messagingIframe = document.createElement('iframe');
  messagingIframe.style.display = 'none';
  messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE;
  document.documentElement.appendChild(messagingIframe);

  registerHandler('_disableJavascriptAlertBoxSafetyTimeout', disableJavscriptAlertBoxSafetyTimeout);

  setTimeout(_callWVJBCallbacks, 0);

  function _callWVJBCallbacks() {
    var callbacks = window.WVJBCallbacks;
    delete window.WVJBCallbacks;
    for (var i = 0; i < callbacks.length; i++) {
      callbacks[i](WebViewJavascriptBridge);
    }
  }
}

/**
 *  vue-bridge-webview config
 */
var bridgeConfig = {
  callHandle: {}, // bridge android / ios
  silent: false,
};

var $bridge = {
  registerHandler: function (name, callback) {
    if (bridgeConfig.silent) {
      console.error(name, ' register handler failure');
    }
  },
  callHandler: function (name, params, callback) {
    if (bridgeConfig.silent) {
      console.error(name, ' call handler webView failure');
    }
  },
};

// ============ device init operation start ===========

/* setup WebView Javascript Bridge for ios , ios 初始化 */
function setupWebViewJavascriptBridge(callback) {
  if (window.WebViewJavascriptBridge) {
    return callback(WebViewJavascriptBridge);
  } else {
    createIosWebViewJavascriptBridge();
    callback(WebViewJavascriptBridge);
  }
  if (window.WVJBCallbacks) {
    return window.WVJBCallbacks.push(callback);
  }
  window.WVJBCallbacks = [callback];
  var WVJBIframe = document.createElement('iframe');
  WVJBIframe.style.display = 'none';
  WVJBIframe.src = 'wvjbscheme://__BRIDGE_LOADED__';
  document.documentElement.appendChild(WVJBIframe);
  setTimeout(function () {
    document.documentElement.removeChild(WVJBIframe);
  }, 0);
}

/* 用于创建桥接对象的函数 , android 初始化 */
function connectWebViewJavascriptBridge(callback) {
  //如果桥接对象已存在，则直接调用callback函数
  if (window.WebViewJavascriptBridge) {
    callback(WebViewJavascriptBridge);
  }
  //否则添加一个监听器来执行callback函数
  else {
    //改为自己创建
    createWebViewJavascriptBridge();
    callback(WebViewJavascriptBridge);
    // document.addEventListener('WebViewJavascriptBridgeReady', function () {
    //   callback(WebViewJavascriptBridge)
    // }, false)
  }
}

/* device detect for ios/android */

try {
  var ua = 'userAgentData' in navigator ? navigator.userAgentData.platform : navigator.userAgent;
  if (/(iPhone|iPad|iPod|iOS)/i.test(ua)) {
    setupWebViewJavascriptBridge(function (bridge) {
      $bridge = bridge;
    });
  } else if (/(Android)/i.test(ua)) {
    connectWebViewJavascriptBridge(function (bridge) {
      $bridge = bridge;
    });
  } else {
    setupWebViewJavascriptBridge(function (bridge) {
      $bridge = bridge;
    });
  }
} catch (e) {
  console.log(`init webView failed`);
}
// ==============device init operation end ============

/**
 * Android / IOS 调用JS,需要明确调用的`function名称` .
 * @param name `function name`
 * @param registerCallback 回调的响应事件
 */
export function registerHandler(name, registerCallback) {
  if ($bridge['registerHandler']) {
    $bridge.registerHandler(name, function (data) {
      if (typeof data === 'string') {
        // 尝试转json
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.log(`parse registerHandler ${name} data failed`);
        }
      }
      registerCallback(data);
    });
  } else {
    console.error("Don't built-in WebView invoking ", name, '{registerHandler}');
    console.log(`invoke registerHandler ${name} failed`);
  }
}

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
export function callHandler(name, params, callback) {
  if ($bridge['callHandler']) {
    $bridge.callHandler(name, params, function (data) {
      if (typeof callback == 'function') {
        if (typeof data === 'string') {
          // 尝试转json
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.log(`parse registerHandler ${name} data failed`);
          }
        }
        callback(data);
      }
    });
  } else {
    console.error("Don't built-in WebView invoking ", name, '{callHandler}');
  }
}
