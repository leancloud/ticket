import _ from 'lodash';

import {
  Model,
  belongsTo,
  field,
  pointerId,
  pointerIds,
  pointTo,
  hasManyThroughPointerArray,
} from '../orm';
import { Category } from './Category';
import { File } from './File';
import { Group } from './Group';
import { Organization } from './Organization';
import { User } from './User';

export interface Evaluation {
  star: number;
  content: string;
}

export class Ticket extends Model {
  @field()
  nid!: number;

  @field()
  title!: string;

  @field()
  content!: string;

  @field({
    avObjectKey: 'category',
    // 不 encode ，而是通过 category 设置分类。目的是同时设置分类名称，兼容旧的数据结构。
    encode: false,
    decode: (category) => category.objectId,
  })
  categoryId!: string;

  @field({
    encode: (c: Category) => ({ objectId: c.id, name: c.name }),
    decode: false,
  })
  @belongsTo(() => Category)
  category?: Category;

  @pointerId(() => User)
  authorId!: string;

  @pointTo(() => User)
  author?: User;

  @pointerId(() => User)
  assigneeId?: string;

  @pointTo(() => User)
  assignee?: User;

  @pointerId(() => Group)
  groupId?: string;

  @pointerId(() => Organization)
  organizationId?: string;

  @pointerIds(() => File)
  fileIds?: string[];

  @hasManyThroughPointerArray(() => File)
  files?: File[];

  @field()
  status!: number;

  @field()
  evaluation?: Evaluation;
}

Ticket.beforeCreate(({ avObject }) => {
  const authorId = avObject.get('author').id as string;
  avObject.set('ACL', {
    [authorId]: { read: true, write: true },
    'role:customerService': { read: true, write: true },
    'role:staff': { read: true },
  });
});
