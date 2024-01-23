import { MergeUserTask } from '@/model/MergeUserTask';
import { UserResponse } from './user';

export class MergeUserTaskResponse {
  constructor(private task: MergeUserTask) {}

  toJSON() {
    return {
      id: this.task.id,
      sourceUserId: this.task.sourceUserId,
      sourceUser: this.task.sourceUser && new UserResponse(this.task.sourceUser).toJSON(),
      targetUser: this.task.targetUser && new UserResponse(this.task.targetUser).toJSON(),
      targetUserId: this.task.targetUserId,
      status: this.task.status,
      completedAt: this.task.completedAt?.toISOString(),
      createdAt: this.task.createdAt.toISOString(),
    };
  }
}
