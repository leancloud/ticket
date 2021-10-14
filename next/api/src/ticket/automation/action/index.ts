import { z } from 'zod';

import { Context } from '..';

import updateAssigneeId from './updateAssigneeId';
import updateCategoryId from './updateCategoryId';
import updateGroupId from './updateGroupId';
import closeTicket from './closeTicket';

export interface Action {
  exec(ctx: Context): void | Promise<void>;
}

export type ActionFactory<T = any> = (options: T) => Action;

const actionFactories: Record<string, ActionFactory> = {
  updateAssigneeId,
  updateCategoryId,
  updateGroupId,
  closeTicket,
};

const actionSchema = z.object({
  type: z.string(),
});

export function action(options: any): Action {
  const { type } = actionSchema.parse(options);
  const factory = actionFactories[type];
  if (!factory) {
    throw new Error('unknown type:' + type);
  }
  return factory(options);
}
