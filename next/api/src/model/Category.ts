import _ from 'lodash';

import {
  AliasModel,
  field,
  pointerIds,
  pointerId,
  pointTo,
  serialize,
  hasManyThroughIdArray,
} from '@/orm';
import { Article } from './Article';
import { ArticleTopic } from './ArticleTopic';
import { Group } from './Group';
import { TicketForm } from './TicketForm';

export interface TinyCategoryInfo {
  objectId: string;
  name: string;
}

export class Category extends AliasModel {
  @field()
  @serialize()
  name!: string;

  @serialize()
  rawName?: string;

  @field()
  @serialize()
  description?: string;

  @field()
  @serialize()
  qTemplate?: string;

  @pointerId(() => Category)
  @serialize()
  parentId?: string;

  @pointTo(() => Category)
  parent?: Category;

  @field()
  @serialize()
  meta?: Record<string, any>;

  @field()
  @serialize()
  order?: number;

  @pointerIds(() => Article)
  @serialize()
  FAQIds?: string[];

  @pointerIds(() => Article)
  @serialize()
  noticeIds?: string[];

  @field()
  @serialize()
  topicIds?: string[];

  @hasManyThroughIdArray(() => ArticleTopic)
  topics!: ArticleTopic[];

  @pointerId(() => Article)
  @serialize()
  articleId?: string;

  @pointTo(() => Article)
  article?: Article;

  @field()
  @serialize()
  isTicketEnabled?: boolean;

  @field()
  @serialize()
  ticketDescription?: string;

  @pointerId(() => Group)
  @serialize()
  groupId?: string;

  @pointTo(() => Group)
  group?: Group;

  @pointerId(() => TicketForm)
  @serialize()
  formId?: string;

  @pointTo(() => TicketForm)
  form?: TicketForm;

  @field()
  @serialize.Date()
  deletedAt?: Date;

  @field()
  @serialize()
  hidden?: boolean;

  getTinyInfo(): TinyCategoryInfo {
    return {
      objectId: this.id,
      name: this.name,
    };
  }
}
