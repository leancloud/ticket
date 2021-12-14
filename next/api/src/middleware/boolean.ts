import type { Context, Middleware } from 'koa';

const STATE_KEY = 'booleanValues';

function factory(key: string, defaultValue?: boolean): Middleware {
  return (ctx, next) => {
    if (!ctx.state[STATE_KEY]) {
      ctx.state[STATE_KEY] = {};
    }
    const value = ctx.query[key];
    if (typeof value === 'string') {
      if (value === 'false' || value === '0') {
        ctx.state[STATE_KEY][key] = false;
      } else {
        ctx.state[STATE_KEY][key] = true;
      }
    } else if (defaultValue !== undefined) {
      ctx.state[STATE_KEY][key] = defaultValue;
    }

    return next();
  };
}

function get(ctx: Context): Record<string, boolean | undefined> {
  return ctx.state[STATE_KEY] ?? {};
}

export const boolean = Object.assign(factory, { get });
