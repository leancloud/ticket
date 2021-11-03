import _ from 'lodash';

import { OpsLog } from '@/model/OpsLog';
import { Ticket } from '@/model/Ticket';

import { Context } from '../context';

export interface TimeTriggerContextConfig {
  ticket: Ticket;
  opsLogs: OpsLog[];
}

export class TimeTriggerContext extends Context {
  readonly opsLogs: OpsLog[];

  constructor(config: TimeTriggerContextConfig) {
    super(config.ticket);
    this.opsLogs = config.opsLogs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getCreateDate(): Date {
    return this.ticket.createdAt;
  }

  getUpdateDate(): Date {
    return this.ticket.updatedAt;
  }

  getSelectAssigneeDate(): Date | undefined {
    const log = this.opsLogs.find((log) => log.action === 'selectAssignee');
    return log?.createdAt;
  }

  getLastAssignDate(): Date | undefined {
    const log = _.findLast(
      this.opsLogs,
      (log) => log.action === 'changeAssignee' && !!log.data.assignee
    );
    return log?.createdAt ?? this.getSelectAssigneeDate();
  }
}
