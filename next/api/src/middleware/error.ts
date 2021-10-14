import type { Middleware } from 'koa';
import { ValidationError } from 'yup';
import { ZodError } from 'zod';

import { getZodErrorMessage } from '@/utils/zod';

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

export const catchLCError: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error: any) {
    switch (error.code) {
      case 101:
      case 211:
        ctx.throw(404, error.message);
      case 403:
        ctx.throw(403, error.message);
    }
    throw error;
  }
};

export const catchZodError: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof ZodError) {
      ctx.throw(400, getZodErrorMessage(error));
    }
    throw error;
  }
};
