import { ReplyRevision } from '@/model/ReplyRevision';
import { sanitize } from '@/utils/xss';
import { FileResponse } from './file';
import { UserResponse } from './user';

export class ReplyRevisionResponse {
  constructor(readonly revision: ReplyRevision) {}

  toJSON() {
    return {
      id: this.revision.id,
      replyId: this.revision.replyId,
      content: this.revision.content,
      contentSafeHTML:
        this.revision.contentHTML === undefined ? undefined : sanitize(this.revision.contentHTML),
      files: this.revision.files?.map((file) => new FileResponse(file)),
      operator: this.revision.operator ? new UserResponse(this.revision.operator) : undefined,
      action: this.revision.action,
      actionTime: this.revision.actionTime.toISOString(),
    };
  }
}
