import { Context, Next } from 'koa';

export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message);
  }

  static async catchHttpError(ctx: Context, next: Next) {
    try {
      await next();
    } catch (error) {
      if (error instanceof HttpError) {
        ctx.throw(error.status, error.message, {
          code: error.code,
        });
      }
      throw error;
    }
  }
}

export class NotFoundError extends HttpError {
  constructor(target: string) {
    super(404, `${target} does not exist`, 'NOT_FOUND');
  }
}

export class InternalServerError extends HttpError {
  constructor(target: string) {
    super(500, target, 'INTERNAL_SERVER_ERROR');
  }
}

export class UnauthorizedError extends HttpError {
  constructor(target: string) {
    super(401, target, 'UNAUTHORIZED');
  }
}
