import { z } from 'zod';
import moment from 'moment';

import { Condition, ConditionFactory, number } from '../../condition';
import { TimeTriggerContext } from '../context';

function getSinceAssignedHours(ctx: TimeTriggerContext): number | undefined {
  const assignedAt = ctx.getLastAssignDate();
  if (assignedAt) {
    return moment().diff(assignedAt, 'hour');
  }
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
