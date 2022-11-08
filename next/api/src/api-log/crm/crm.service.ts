import { ApiLog } from '../types';
import { CrmLog } from './types';

const TIMER_INTERVAL = 1000 * 10;

const LOG_BUFFER_SIZE = 100;

class CrmService {
  private timerId?: NodeJS.Timer;

  private logBuffer: CrmLog[] = [];

  startTimer() {
    if (this.timerId) {
      return;
    }
    this.timerId = setInterval(this.flush.bind(this), TIMER_INTERVAL);
  }

  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      delete this.timerId;
    }
  }

  write(log: ApiLog) {
    if (log.route.startsWith('/api/2/unread')) {
      return;
    }
    this.logBuffer.push({
      timestamp: log.timestamp,
      method: log.method,
      route: log.route,
      url: log.url,
      host: log.host,
      status_code: log.statusCode,
      process_time: log.processTime,
      app_id: log.appId,
      product_id: log.productId,
      user_id: log.userId,
      user_agent: log.userAgent,
      referer: log.referer,
    });
    if (this.logBuffer.length >= LOG_BUFFER_SIZE) {
      this.flush();
    }
  }

  flush() {
    if (this.logBuffer.length === 0) {
      return;
    }

    // TODO start
    const str = this.logBuffer.map((log) => JSON.stringify(log)).join('\n');
    console.log(str);
    // TODO end

    this.logBuffer = [];
  }
}

export default new CrmService();
