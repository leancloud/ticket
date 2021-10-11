import xss from '@/utils/xss';
import { Reply } from '@/model/Reply';
import { FileResponse } from './file';
import { UserResponse } from './user';

export class ReplyResponse {
  constructor(readonly reply: Reply) {}

  toJSON() {
    return {
      id: this.reply.id,
      content: this.reply.content,
      contentSafeHTML: xss.process(this.reply.contentHTML),
      author: this.reply.author ? new UserResponse(this.reply.author) : undefined,
      isCustomerService: this.reply.isCustomerService,
      files: this.reply.files?.map((file) => new FileResponse(file)),
      createdAt: this.reply.createdAt.toISOString(),
      updatedAt: this.reply.updatedAt.toISOString(),
    };
  }
}
