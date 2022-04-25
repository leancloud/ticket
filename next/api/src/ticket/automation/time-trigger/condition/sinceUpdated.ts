import { z } from 'zod';
import moment from 'moment';

import { Condition, ConditionFactory, number } from '../../condition';
import { TimeTriggerContext } from '../context';

function getSinceUpdatedHours(ctx: TimeTriggerContext): number {
  return moment().diff(ctx.getUpdateDate(), 'hour');
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
