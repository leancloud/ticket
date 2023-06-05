import { FileSchema } from './file';
import { UserSchema } from './user';

export interface ReplySchema {
  id: string;
  content: string;
  contentSafeHTML: string;
  author: UserSchema;
  isCustomerService: boolean;
  internal?: boolean;
  files?: FileSchema[];
  createdAt: string;
  updatedAt: string;
}
