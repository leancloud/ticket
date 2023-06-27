export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly numCode?: number
  ) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  constructor(target: string) {
    super(404, `${target} does not exist`, 'NOT_FOUND', 9001);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string) {
    super(500, message, 'INTERNAL_SERVER_ERROR', 9500);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(401, message, 'UNAUTHORIZED', 9000);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(400, message, 'BAD_REQUEST', 9100);
  }
}
