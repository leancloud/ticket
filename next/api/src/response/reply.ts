import { sanitize } from '@/utils/xss';
import { Reply } from '@/model/Reply';
import { FileResponse } from './file';
import { UserResponse } from './user';

export class ReplyResponse {
  constructor(readonly reply: Reply, private transferFile = false) {}

  toJSON() {
    return {
      id: this.reply.id,
      content: this.reply.content,
      contentSafeHTML: sanitize(this.reply.contentHTML),
      author: this.reply.author && new UserResponse(this.reply.author).toJSON(),
      isCustomerService: this.reply.isCustomerService,
      files: this.reply.files?.map((file) => new FileResponse(file, this.transferFile).toJSON()),
      internal: this.reply.internal,
      edited: this.reply.edited,
      createdAt: this.reply.createdAt.toISOString(),
      updatedAt: this.reply.updatedAt.toISOString(),
      deletedAt: this.reply.deletedAt?.toISOString(),
    };
  }
}
