import { OpsLog } from '@/model/OpsLog';

export class OpsLogResponse {
  constructor(readonly opsLog: OpsLog) {}

  toJSON() {
    const log: {
      [key: string]: any;
    } = {
      id: this.opsLog.id,
      action: this.opsLog.action,
      createdAt: this.opsLog.createdAt.toISOString(),
      updatedAt: this.opsLog.updatedAt.toISOString(),
    };
    const { data } = this.opsLog;
    if (data.operator) {
      log.operatorId = data.operator.objectId;
    }

    if (data.assignee) {
      log.assigneeId = data.assignee.objectId;
    }

    if (data.category) {
      log.categoryId = data.category.objectId;
    }
    if (data.group) {
      log.groupId = data.group.objectId;
    }
    if (data.changes) {
      log.changes = data.changes;
    }
    return log;
  }
}
