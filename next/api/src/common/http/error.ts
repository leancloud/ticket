import { Context, Next } from 'koa';

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }

  static async catchHttpError(ctx: Context, next: Next) {
    try {
      await next();
    } catch (error) {
      if (error instanceof HttpError) {
        ctx.throw(error.status, error.message);
      }
      throw error;
    }
  }
}
