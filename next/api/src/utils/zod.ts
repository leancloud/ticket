import { ZodError } from 'zod';

export function getZodErrorMessage(error: ZodError): string {
  const issue = error.issues[0];
  const path = issue.path.join('.');
  return (path ? path + ': ' : '') + issue.message;
}
