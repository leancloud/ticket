declare global {
  interface Window {
    WVJBCallbacks?: any[];
    WebViewJavascriptBridge?: Bridge;
    webViewJavascriptInterface?: {
      notice: (message: string) => void;
    };
  }
}

export const registerHandler: (name: string, registerCallback: (data: any) => void) => void;

export const callHandler: (name: string, params: any, callback: (data: any) => void) => void;
