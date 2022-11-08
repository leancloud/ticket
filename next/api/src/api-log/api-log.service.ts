import { ApiLog } from './types';
import crmService from './crm/crm.service';

class ApiLogService {
  private listeners: ((log: ApiLog) => void)[] = [];

  constructor() {
    const { ENABLE_CRM } = process.env;
    if (ENABLE_CRM) {
      crmService.startTimer();
      this.listeners.push((log) => crmService.write(log));
    }
  }

  write(log: ApiLog) {
    for (const listener of this.listeners) {
      listener(log);
    }
  }
}

export default new ApiLogService();
