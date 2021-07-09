import Joi from 'joi';
import Koa from 'koa';
import _ from 'lodash';

export interface Schema {
  query?: Joi.SchemaMap;
  body?: Joi.SchemaMap;
}

export default function validate(
  schema: Schema,
  convert = true
): Koa.Middleware {
  const validator = Joi.object(
    Object.entries(schema).reduce<Joi.SchemaMap>((map, [key, value]) => {
      map[key] = Joi.object(value).unknown(true);
      return map;
    }, {})
  ).unknown(true);

  return async (ctx, next) => {
    const data: Record<string, any> = {};
    if (schema.query) {
      data.query = ctx.request.query;
    }
    if (schema.body) {
      data.body = ctx.request.body;
    }
    const { error, value } = validator.validate(data);
    if (error) {
      ctx.throw(400, error.message);
    }
    if (convert) {
      Object.assign(ctx.request, value);
    }
    await next();
  };
}
