import { Context } from 'koa';

import { HandlerParam } from '@/common/http';

export interface Pipe<TInput, TOutput> {
  transform(data: TInput, ctx: Context, param: HandlerParam): TOutput | Promise<TOutput>;
}

export * from './ParseBoolPipe';
export * from './ParseCsvPipe';
export * from './ParseDatePipe';
export * from './ParseIntPipe';
export * from './ParseOrderPipe';
export * from './ValidationPipe';
export * from './FindModelPipe';
export * from './TrimPipe';
