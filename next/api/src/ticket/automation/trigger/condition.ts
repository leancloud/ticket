import { z } from 'zod';

import { Condition, ConditionFactory, all, any } from '../condition';
import { ticket } from '../condition/ticket';
import { title } from '../condition/title';
import { content } from '../condition/content';
import { categoryId } from '../condition/categoryId';
import { authorId } from '../condition/authorId';
import { assigneeId } from '../condition/assigneeId';
import { groupId } from '../condition/groupId';
import { status } from '../condition/status';
import { currentUserId } from '../condition/currentUserId';

const factories: Record<string, ConditionFactory> = {
  ticket,
  title,
  content,
  categoryId,
  authorId,
  assigneeId,
  groupId,
  status,
  currentUserId,
  any: any(condition),
  all: all(condition),
};

const schema = z.object({
  type: z.string(),
});

export function condition(options: unknown): Condition {
  const { type } = schema.parse(options);
  const factory = factories[type];
  if (!factory) {
    throw new Error('Unknown type: ' + type);
  }
  return factory(options);
}
