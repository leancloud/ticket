import { z } from 'zod';

import { Context } from '../../context';
import { ConditionFactory } from '..';

type Getter<Ctx extends Context = Context> = (ctx: Ctx) => any;

const schema = z.object({
  value: z.number(),
});

export function is<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    const { value } = schema.parse(options);
    return {
      name: `${name} == ${value}`,
      test: (ctx) => {
        const source = getter(ctx);
        if (typeof source !== 'number') {
          return false;
        }
        return source === value;
      },
    };
  };
}

export function gt<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    const { value } = schema.parse(options);
    return {
      name: `${name} > ${value}`,
      test: (ctx) => {
        const source = getter(ctx);
        if (typeof source !== 'number') {
          return false;
        }
        return source > value;
      },
    };
  };
}

export function gte<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    const { value } = schema.parse(options);
    return {
      name: `${name} >= ${value}`,
      test: (ctx) => {
        const source = getter(ctx);
        if (typeof source !== 'number') {
          return false;
        }
        return source >= value;
      },
    };
  };
}

export function lt<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    const { value } = schema.parse(options);
    return {
      name: `${name} < ${value}`,
      test: (ctx) => {
        const source = getter(ctx);
        if (typeof source !== 'number') {
          return false;
        }
        return source < value;
      },
    };
  };
}

export function lte<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    const { value } = schema.parse(options);
    return {
      name: `${name} <= ${value}`,
      test: (ctx) => {
        const source = getter(ctx);
        if (typeof source !== 'number') {
          return false;
        }
        return source <= value;
      },
    };
  };
}
