import { z } from 'zod';
import moment from 'moment';

import { Condition, ConditionFactory, number } from '../../condition';
import { TimeTriggerContext } from '../context';

function getSinceCreatedHours(ctx: TimeTriggerContext): number {
  return moment().diff(ctx.getCreateDate(), 'hour');
}

const factories: Record<string, ConditionFactory<any, TimeTriggerContext>> = {
  is: number.is(getSinceCreatedHours, 'hours since created'),
  gt: number.gt(getSinceCreatedHours, 'hours since created'),
  lt: number.lt(getSinceCreatedHours, 'hours since created'),
  gte: number.gte(getSinceCreatedHours, 'hours since created'),
  lte: number.lte(getSinceCreatedHours, 'hours since created'),
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
