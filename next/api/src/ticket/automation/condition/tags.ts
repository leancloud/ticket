import { z } from 'zod';

import { Condition, ConditionFactory } from '.';

const contains: ConditionFactory<z.infer<typeof schema>> = (config) => {
  return {
    test: (ctx) => {
      const tags = config.private ? ctx.getPrivateTags() : ctx.getTags();
      if (tags) {
        return tags.some((tag) => tag.key === config.key && tag.value === config.value);
      }
      return false;
    },
  };
};

const factories: Record<string, ConditionFactory> = {
  contains,
};

const schema = z.object({
  op: z.string(),
  key: z.string(),
  value: z.string(),
  private: z.boolean().optional(),
});

export default function (options: unknown): Condition {
  const { op } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(options);
}
