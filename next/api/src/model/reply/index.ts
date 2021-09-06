import AV from 'leancloud-storage';

import { Query } from '../../query';
import { User } from '../user';
import { File } from '../file';

export class Reply {
  id: string;
  content: string;
  contentHTML: string;
  author: User;
  isCustomerService: boolean;
  files?: File[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    content: string;
    contentHTML: string;
    author: User;
    isCustomerService: boolean;
    files?: File[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.content = data.content;
    this.contentHTML = data.contentHTML;
    this.author = data.author;
    this.isCustomerService = data.isCustomerService;
    this.files = data.files;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static className = 'Reply';

  static fromAVObject(object: AV.Object) {
    return new Reply({
      id: object.id!,
      content: object.get('content'),
      contentHTML: object.get('content_HTML'),
      author: User.fromAVObject(object.get('author')),
      isCustomerService: !!object.get('isCustomerService'),
      files: object.get('files')?.map(File.fromAVObject),
      createdAt: object.createdAt!,
      updatedAt: object.updatedAt!,
    });
  }

  static query() {
    return new Query(Reply);
  }
}
