import { z } from 'zod';

import { Condition, ConditionFactory, all, any } from '../../condition';
import title from '../../condition/title';
import content from '../../condition/content';
import categoryId from '../../condition/categoryId';
import groupId from '../../condition/groupId';
import status from '../../condition/status';
import language from '../../condition/language';
import metaData from '../../condition/metaData';
import tags from '../../condition/tags';

import { TriggerContext } from '../context';
import ticket from './ticket';
import authorId from './authorId';
import assigneeId from './assigneeId';
import currentUserId from './currentUserId';
import replyContent from './replyContent';

const factories: Record<string, ConditionFactory<unknown, TriggerContext>> = {
  ticket,
  title,
  content,
  categoryId,
  authorId,
  assigneeId,
  groupId,
  status,
  language,
  metaData,
  tags,
  currentUserId,
  replyContent,
  any: any(condition),
  all: all(condition),
};

const schema = z.object({
  type: z.string(),
});

export function condition(options: unknown): Condition<TriggerContext> {
  const { type } = schema.parse(options);
  const factory = factories[type];
  if (!factory) {
    throw new Error('Unknown type: ' + type);
  }
  return factory(options);
}
