import { Schema, ZodError } from 'zod';

export abstract class ViewCondition<T> {
  constructor(protected data: T) {}

  abstract getCondition(): any;

  abstract getZodSchema(): Schema<T>;

  validate(): ZodError<T> | undefined {
    const schema = this.getZodSchema();
    const result = schema.safeParse(this.data);
    if (!result.success) {
      return result.error;
    }
  }

  assertDataIsValid() {
    const error = this.validate();
    if (error) {
      throw error;
    }
  }
}
