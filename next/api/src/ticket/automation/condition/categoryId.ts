import { z } from 'zod';

import { categoryService } from '@/category';
import { Condition, ConditionFactory } from '.';
import { not } from './common';

const is: ConditionFactory<string> = (value) => {
  return {
    name: `category is ${value}`,
    test: (ctx) => {
      return ctx.getCategoryId() === value;
    },
  };
};

const isIncluded: ConditionFactory<string> = (value) => {
  return {
    name: `category belongs to ${value}`,
    test: async (ctx) => {
      const categoryId = ctx.getCategoryId();
      const subCategories = await categoryService.getSubCategories(value);
      const idx = subCategories.findIndex((c) => c.id === categoryId);
      return idx >= 0;
    },
  };
};

const factories: Record<string, ConditionFactory<string>> = {
  is,
  isNot: not(is),
  isIncluded,
};

const schema = z.object({
  op: z.string(),
  value: z.string(),
});

export default function (options: unknown): Condition {
  const { op, value } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(value);
}
