import { z } from 'zod';

import { Condition, ConditionFactory, number } from '../../condition';
import { TimeTriggerContext } from '../context';

function getSinceUpdatedHours(ctx: TimeTriggerContext): number {
  const createdAt = ctx.getUpdateDate();
  const ms = Date.now() - createdAt.getTime();
  return ms / 1000 / 60 / 60;
}

const factories: Record<string, ConditionFactory<any, TimeTriggerContext>> = {
  is: number.is(getSinceUpdatedHours, 'hours since updated'),
  gt: number.gt(getSinceUpdatedHours, 'hours since updated'),
  lt: number.lt(getSinceUpdatedHours, 'hours since updated'),
  gte: number.gte(getSinceUpdatedHours, 'hours since updated'),
  lte: number.lte(getSinceUpdatedHours, 'hours since updated'),
};

const schema = z.object({
  op: z.string(),
});

export default function (options: unknown): Condition<TimeTriggerContext> {
  const { op } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(options);
}
