import { z } from 'zod';

import { Condition, ConditionFactory, all, any } from '../../condition';
import title from '../../condition/title';
import content from '../../condition/content';
import categoryId from '../../condition/categoryId';
import authorId from '../../condition/authorId';
import assigneeId from '../../condition/assigneeId';
import groupId from '../../condition/groupId';
import status from '../../condition/status';
import metaData from '../../condition/metaData';

import { TimeTriggerContext } from '../context';
import sinceCreated from './sinceCreated';
import sinceUpdated from './sinceUpdated';
import sinceAssigned from './sinceAssigned';

const factories: Record<string, ConditionFactory<unknown, TimeTriggerContext>> = {
  title,
  content,
  categoryId,
  authorId,
  assigneeId,
  groupId,
  status,
  metaData,
  sinceCreated,
  sinceUpdated,
  sinceAssigned,
  any: any(condition),
  all: all(condition),
};

const schema = z.object({
  type: z.string(),
});

export function condition(options: unknown): Condition<TimeTriggerContext> {
  const { type } = schema.parse(options);
  const factory = factories[type];
  if (!factory) {
    throw new Error('Unknown type: ' + type);
  }
  return factory(options);
}
