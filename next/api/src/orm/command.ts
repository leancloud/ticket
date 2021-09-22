import { Flat } from './utils';

export interface IncCommand {
  __op: 'Increment';
  amount: number;
}

export interface PushUniqCommand<T> {
  __op: 'AddUnique';
  objects: T[];
}

export type TypeCommands<T> = T extends number
  ? IncCommand
  : T extends any[]
  ? PushUniqCommand<Flat<T>>
  : never;

function inc(amount = 1): IncCommand {
  return { __op: 'Increment', amount };
}

function pushUniq<T>(...objects: T[]): PushUniqCommand<T> {
  return { __op: 'AddUnique', objects };
}

export const commands = {
  inc,
  pushUniq,
};
