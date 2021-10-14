import { Schema } from 'zod';

import { Action } from '@/ticket/automation';

export type ActionFactory<T = any> = (options: T) => Action;

export function check<T>(schema: Schema<T>, factory: ActionFactory<T>): ActionFactory<T> {
  return (options) => factory(schema.parse(options));
}
