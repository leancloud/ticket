import { z } from 'zod';

import { User } from '@/model/User';
import { Condition, ConditionFactory } from '.';
import { not } from './common';

const isCustomerService: Condition = {
  name: 'current user is customer service',
  test: (ctx) => {
    return User.isCustomerService(ctx.currentUserId);
  },
};

const is: ConditionFactory<string> = (value) => {
  if (value === '__customerService') {
    return isCustomerService;
  }
  return {
    name: `current user is ${value}`,
    test: (ctx) => {
      return ctx.currentUserId === value;
    },
  };
};

const factories: Record<string, ConditionFactory<string>> = {
  is,
  isNot: not(is),
};

const schema = z.object({
  op: z.string(),
  value: z.string(),
});

export function currentUserId(options: unknown) {
  const { op, value } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(value);
}
