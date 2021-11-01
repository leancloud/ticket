import { Context } from '../context';

export interface Action {
  exec(ctx: Context): void | Promise<void>;
}

export type ActionFactory<T = any> = (options: T) => Action;
