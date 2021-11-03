import { Context } from '../context';

export interface Action<Ctx extends Context = Context> {
  exec(ctx: Ctx): void | Promise<void>;
}

export type ActionFactory<T = any, Ctx extends Context = Context> = (options: T) => Action<Ctx>;
