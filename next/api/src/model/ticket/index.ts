import AV from 'leancloud-storage';

import { Query } from '../../query';
import { Group } from '../group';
import { User } from '../user';

export class Ticket {
  id: string;
  nid: number;
  title: string;
  content: string;
  categoryId: string;
  authorId: string;
  author?: User;
  assigneeId?: string;
  assignee?: User;
  groupId?: string;
  group?: Group;
  organizationId?: string;
  fileIds?: string[];
  status: number;
  evaluation?: { star: number; content: string };
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    nid: number;
    title: string;
    content: string;
    categoryId: string;
    authorId: string;
    assigneeId?: string;
    groupId?: string;
    organizationId?: string;
    fileIds?: string[];
    status: number;
    evaluation?: { star: number; content: string };
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.nid = data.nid;
    this.title = data.title;
    this.content = data.content;
    this.categoryId = data.categoryId;
    this.authorId = data.authorId;
    this.assigneeId = data.assigneeId;
    this.groupId = data.groupId;
    this.organizationId = data.organizationId;
    this.fileIds = data.fileIds;
    this.status = data.status;
    this.evaluation = data.evaluation;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static className = 'Ticket';

  static fromAVObject(object: AV.Object) {
    return new Ticket({
      id: object.id!,
      nid: object.get('nid'),
      title: object.get('title'),
      content: object.get('content'),
      categoryId: object.get('category').objectId,
      authorId: object.get('author')?.id,
      assigneeId: object.get('assignee')?.id,
      groupId: object.get('group')?.id,
      organizationId: object.get('organization')?.id,
      fileIds: object.get('files')?.map((f: AV.File) => f.id),
      status: object.get('status'),
      evaluation: object.get('evaluation'),
      createdAt: object.createdAt!,
      updatedAt: object.updatedAt!,
    });
  }

  static query() {
    return new Query(Ticket);
  }
}
