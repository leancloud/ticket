import AV from 'leancloud-storage';

import { Query } from '../../query';
import { Group } from '../group';
import { User } from '../user';
import { File } from '../file';
import { Category, CategoryManager } from '../category';

export class Ticket {
  id: string;
  nid: number;
  title: string;
  content: string;
  contentHTML: string;
  categoryId: string;
  categoryPath?: Category[];
  authorId: string;
  author?: User;
  assigneeId?: string;
  assignee?: User;
  groupId?: string;
  group?: Group;
  organizationId?: string;
  fileIds?: string[];
  files?: File[];
  status: number;
  evaluation?: { star: number; content: string };
  replyCount?: number;
  latestReply?: any;
  metaData?: object;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    nid: number;
    title: string;
    content: string;
    contentHTML: string;
    categoryId: string;
    authorId: string;
    assigneeId?: string;
    groupId?: string;
    organizationId?: string;
    fileIds?: string[];
    files?: File[];
    status: number;
    evaluation?: { star: number; content: string };
    replyCount?: number;
    latestReply?: any;
    metaData?: object;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.nid = data.nid;
    this.title = data.title;
    this.content = data.content;
    this.contentHTML = data.contentHTML;
    this.categoryId = data.categoryId;
    this.authorId = data.authorId;
    this.assigneeId = data.assigneeId;
    this.groupId = data.groupId;
    this.organizationId = data.organizationId;
    this.fileIds = data.fileIds;
    this.files = data.files;
    this.status = data.status;
    this.evaluation = data.evaluation;
    this.replyCount = data.replyCount;
    this.latestReply = data.latestReply;
    this.metaData = data.metaData;
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
      contentHTML: object.get('content_HTML'),
      categoryId: object.get('category').objectId,
      authorId: object.get('author')?.id,
      assigneeId: object.get('assignee')?.id,
      groupId: object.get('group')?.id,
      organizationId: object.get('organization')?.id,
      fileIds: object.get('files')?.map((f: AV.File) => f.id),
      files: object.get('files')?.map(File.fromAVObject),
      status: object.get('status'),
      evaluation: object.get('evaluation'),
      replyCount: object.get('replyCount'),
      latestReply: object.get('latestReply'),
      metaData: object.get('metaData'),
      createdAt: object.createdAt!,
      updatedAt: object.updatedAt!,
    });
  }

  static query() {
    return new Query(Ticket);
  }

  static ptr(id: string) {
    return { __type: 'Pointer', className: Ticket.className, objectId: id };
  }

  static async find(id: string, include?: string[], sessionToken?: string): Promise<Ticket> {
    const object = await new AV.Query<AV.Object>(Ticket.className).include(include ?? []).get(id, {
      sessionToken,
    });
    return Ticket.fromAVObject(object);
  }

  async updateCategoryPath() {
    this.categoryPath = await CategoryManager.getFullCategoryPath(this.categoryId);
  }
}
