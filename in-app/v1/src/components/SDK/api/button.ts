import { callHandlerPromise } from './utils';

/**
 * 检查间隔
 * */
const CHECK_INTERVAL = 3000;

/**
 * 防止死循环检查定时器
 * 当程序出现task占满时将无法执行定时器，则释放关闭按钮
 * 防止用户无法退出webview
 * */
let checkTimer: number | null = null;

const _showCloseButton = () => callHandlerPromise('showCloseButton');
const _hideCloseButton = (duration = 3000) => callHandlerPromise('hideCloseButton', { duration });

/**
 * 显示右上角关闭按钮
 * */
export function showCloseButton() {
  if (checkTimer) {
    clearTimeout(checkTimer);
  }
  _showCloseButton();
}

/**
 * 隐藏右上角关闭按钮
 * */
export function hideCloseButton() {
  _hideCloseButton(CHECK_INTERVAL + 1000);
  clearTimeout(checkTimer as number);
  checkTimer = setTimeout(() => hideCloseButton(), CHECK_INTERVAL) as any;
}
