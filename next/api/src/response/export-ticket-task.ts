import { ExportTicketTask } from '@/model/ExportTicketTask';
import { UserResponse } from './user';

export class ExportTicketTaskResponse {
  constructor(private task: ExportTicketTask) {}

  toJSON() {
    return {
      id: this.task.id,
      operator: this.task.operator && new UserResponse(this.task.operator),
      status: this.task.status,
      ticketCount: this.task.ticketCount,
      downloadUrl: this.task.downloadUrl,
      completedAt: this.task.completedAt?.toISOString(),
      createdAt: this.task.createdAt.toISOString(),
    };
  }
}
