import { Schema, ZodError } from 'zod';

import { User } from '@/model/User';
import { Group } from '@/model/Group';

export class ViewConditionContext {
  private getGroupsTask?: Promise<Group[]>;

  constructor(readonly currentUser: User) {}

  async getGroupsOfCurrentUser(): Promise<Group[]> {
    if (!this.getGroupsTask) {
      this.getGroupsTask = this.currentUser.getGroups().catch((error) => {
        delete this.getGroupsTask;
        throw error;
      });
    }
    return this.getGroupsTask;
  }
}

export abstract class ViewCondition<T> {
  constructor(protected data: T) {}

  abstract getCondition(context: ViewConditionContext): any | Promise<any>;

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
