import { z } from 'zod';

import { Condition, ConditionFactory, number } from '../../condition';
import { TimeTriggerContext } from '../context';

function getSinceAssignedHours(ctx: TimeTriggerContext): number | undefined {
  const date = ctx.getLastAssignDate();
  if (!date) {
    return undefined;
  }
  const ms = Date.now() - date.getTime();
  return ms / 1000 / 60 / 60;
}

const factories: Record<string, ConditionFactory<any, TimeTriggerContext>> = {
  is: number.is(getSinceAssignedHours, 'hours since assigned'),
  gt: number.gt(getSinceAssignedHours, 'hours since assigned'),
  lt: number.lt(getSinceAssignedHours, 'hours since assigned'),
  gte: number.gte(getSinceAssignedHours, 'hours since assigned'),
  lte: number.lte(getSinceAssignedHours, 'hours since assigned'),
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
