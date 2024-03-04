import moment from 'moment';

import {
  getCustomerServiceActionLogs,
  GetCustomerServiceActionLogsResult,
} from '@/api/customer-service-action-log';
import { FilterFormData } from './components/FilterForm';

export interface ActionLogCollectorOptions<T> {
  filters: FilterFormData;
  transform: (data: GetCustomerServiceActionLogsResult) => T[];
}

export class ActionLogCollector<T> {
  private window: [Date, Date];
  private operatorIds?: string[];

  private logChunks: T[][] = [];
  private transform: (data: GetCustomerServiceActionLogsResult) => T[];

  private started = false;
  private aborted = false;

  onSuccess?: (data: T[]) => void;
  onError?: (error: unknown) => void;

  constructor(public options: ActionLogCollectorOptions<T>) {
    this.window = [options.filters.dateRange[0].toDate(), options.filters.dateRange[1].toDate()];
    this.transform = options.transform;
  }

  private async _collect() {
    if (this.aborted) {
      return;
    }

    const pageSize = 1000;

    try {
      const data = await getCustomerServiceActionLogs({
        from: this.window[0].toISOString(),
        to: this.window[1].toISOString(),
        operatorIds: this.operatorIds,
        pageSize,
      });

      const logs = this.transform(data);
      if (logs.length) {
        this.logChunks.push(logs);
      }

      if (data.logs.length < pageSize) {
        if (this.onSuccess) {
          this.onSuccess(this.logChunks.flat());
        }
        return;
      }

      this.window[0] = moment(data.logs[data.logs.length - 1].ts)
        .add(1, 'ms')
        .toDate();

      setTimeout(() => this._collect(), 100);
    } catch (error) {
      this.onError?.(error);
    }
  }

  collect() {
    if (this.started) return;
    this.started = true;
    this._collect();
  }

  abort() {
    this.aborted = true;
  }
}
