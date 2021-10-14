import { Schema, ZodError } from 'zod';

export function getMessage(error: ZodError): string {
  const issue = error.issues[0];
  const path = issue.path.join('.');
  return (path ? path + ': ' : '') + issue.message;
}

export function parse<T>(schema: Schema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new Error(getMessage(error as ZodError));
  }
}
