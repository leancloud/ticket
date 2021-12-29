import { Context } from 'koa';
import { Schema, ZodError } from 'zod';

import { HandlerParam } from '@/common/http';

export class ZodValidationPipe<Output> {
  constructor(private schema: Schema<Output>) {}

  transform(data: any, ctx: Context, param: HandlerParam): Output {
    try {
      return this.schema.parse(data);
    } catch (error) {
      const { issues } = error as ZodError;
      const issue = issues[0];

      let field = '';
      if (issue.path.length) {
        field = issue.path.join('.');
      }
      if (param.position) {
        field = field ? `${param.position}.${field}` : param.position;
      }

      ctx.throw(400, field ? `${field}: ${issue.message}` : issue.message);
    }
  }
}
