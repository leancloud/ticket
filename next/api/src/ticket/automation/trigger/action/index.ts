import { z } from 'zod';

import { Action, ActionFactory } from '../../action';
import updateCategoryId from '../../action/updateCategoryId';
import updateGroupId from '../../action/updateGroupId';
import closeTicket from '../../action/closeTicket';
import addTag from '../../action/addTag';
import removeTag from '../../action/removeTag';

import { TriggerContext } from '../context';
import updateAssigneeId from './updateAssigneeId';

const factories: Record<string, ActionFactory<unknown, TriggerContext>> = {
  updateAssigneeId,
  updateCategoryId,
  updateGroupId,
  closeTicket,
  addTag,
  removeTag,
};

const schema = z.object({
  type: z.string(),
});

export function action(options: unknown): Action<TriggerContext> {
  const { type } = schema.parse(options);
  const factory = factories[type];
  if (!factory) {
    throw new Error('Unknown type: ' + type);
  }
  return factory(options);
}
