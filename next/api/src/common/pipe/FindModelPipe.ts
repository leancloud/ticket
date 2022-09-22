import { Context } from 'koa';

import { NotFoundError } from '@/common/http';
import { AuthOptions, Model } from '@/orm';
import { User } from '@/model/User';

export class FindModelPipe<M extends typeof Model> {
  constructor(private model: M, private authOptions?: AuthOptions) {}

  async transform(id: string, ctx: Context): Promise<InstanceType<M>> {
    const currentUser = ctx.state.currentUser as User | undefined;

    const instance = await this.model.find(id, this.authOptions ?? currentUser?.getAuthOptions());
    if (!instance) {
      throw new NotFoundError(`${this.model.getClassName()} "${id}"`);
    }

    return instance;
  }
}

export class FindModelWithoutDeleteFlagPipe<M extends typeof Model> {
  constructor(private model: M, private authOptions?: AuthOptions) {}

  async transform(id: string, ctx: Context): Promise<InstanceType<M>> {
    const currentUser = ctx.state.currentUser as User | undefined;

    const instance = await this.model
      .queryBuilder()
      .where('objectId', '==', id)
      .where('deletedAt', 'not-exists')
      .first(this.authOptions ?? currentUser?.getAuthOptions());
    if (!instance) {
      throw new NotFoundError(`${this.model.getClassName()} "${id}"`);
    }

    return instance;
  }
}

export class FindModelOptionalPipe<M extends typeof Model> {
  constructor(private model: M, private authOptions?: AuthOptions) {}

  async transform(id: string | undefined, ctx: Context): Promise<InstanceType<M> | undefined> {
    if (!id) {
      return undefined;
    }

    const currentUser = ctx.state.currentUser as User | undefined;

    const instance = await this.model.find(id, this.authOptions ?? currentUser?.getAuthOptions());
    if (!instance) {
      throw new NotFoundError(`${this.model.getClassName()} "${id}"`);
    }

    return instance;
  }
}
