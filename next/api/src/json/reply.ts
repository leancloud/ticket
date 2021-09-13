import xss from '../utils/xss';
import { Reply } from '../model2/Reply';
import { FileResponse } from './file';
import { UserJson } from './user';

export class ReplyJSON {
  constructor(readonly reply: Reply) {}

  toJSON() {
    return {
      id: this.reply.id,
      content: this.reply.content,
      contentSafeHTML: xss.process(this.reply.contentHTML),
      author: this.reply.author ? new UserJson(this.reply.author) : undefined,
      isCustomerService: this.reply.isCustomerService,
      files: this.reply.files?.map((file) => new FileResponse(file)),
      createdAt: this.reply.createdAt.toISOString(),
      updatedAt: this.reply.updatedAt.toISOString(),
    };
  }
}
