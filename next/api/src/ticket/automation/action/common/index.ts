import { Schema } from 'zod';

import { ActionFactory } from '..';

export function check<T>(schema: Schema<T>, factory: ActionFactory<T>): ActionFactory<T> {
  return (options) => factory(schema.parse(options));
}
