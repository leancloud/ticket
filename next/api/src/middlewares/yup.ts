import type { Middleware } from 'koa';
import { ValidationError } from 'yup';

export const catchYupError: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof ValidationError) {
      ctx.throw(400, error.errors[0]);
    }
    throw error;
  }
};
