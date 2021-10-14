import { z } from 'zod';

import { parse } from '@/utils/zod';
import { Action, Condition, Context } from '..';
import { any, all, condition } from '../condition';
import { action } from '../action';
import { systemUser } from '@/model/User';

export class Trigger {
  constructor(private condition: Condition, private actions: Action[]) {}

  async exec(ctx: Context) {
    if (await this.condition.test(ctx)) {
      for (const action of this.actions) {
        await action.exec(ctx);
      }
      // TODO: ignore trigger
      await ctx.updater.update(systemUser);
    }
  }
}

const triggerSchema = z.object({
  conditions: z.object({
    any: z.array(z.any()),
    all: z.array(z.any()),
  }),
  actions: z.array(z.any()),
});

export function trigger(options: any): Trigger {
  const parsedOptions = parse(triggerSchema, options);
  const anyConditions: Condition[] = [];
  const allConditions: Condition[] = [];
  const actions: Action[] = [];

  parsedOptions.conditions.any.forEach((options, i) => {
    try {
      anyConditions.push(condition(options));
    } catch (error) {
      throw new Error(`conditions.any.${i}: ` + (error as Error).message);
    }
  });
  parsedOptions.conditions.all.forEach((options, i) => {
    try {
      allConditions.push(condition(options));
    } catch (error) {
      throw new Error(`conditions.all.${i}: ` + (error as Error).message);
    }
  });

  parsedOptions.actions.forEach((options, i) => {
    try {
      actions.push(action(options));
    } catch (error) {
      throw new Error(`actions.${i}: ` + (error as Error).message);
    }
  });

  return new Trigger(all([any(anyConditions), all(allConditions)]), actions);
}
