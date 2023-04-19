import { QuickReply } from '@/model/QuickReply';

export class QuickReplyResponse {
  constructor(readonly quickReply: QuickReply) {}

  toJSON() {
    return {
      id: this.quickReply.id,
      name: this.quickReply.name,
      content: this.quickReply.content,
      userId: this.quickReply.userId,
      fileIds: this.quickReply.fileIds,
      tags: this.quickReply.tags,
    };
  }
}
