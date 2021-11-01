import { z } from 'zod';

import { Context } from '../../context';
import { ConditionFactory } from '..';

type Getter<Ctx extends Context = Context> = (ctx: Ctx) => any;

const stringSchema = z.object({
  value: z.string(),
  caseSensitive: z.boolean().optional(),
});

export function eq<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    let { value, caseSensitive } = stringSchema.parse(options);
    return {
      name: `${name} == ${value}${caseSensitive ? ' (case sensitive)' : ''}`,
      test: (ctx) => {
        let source = getter(ctx);
        if (typeof source !== 'string') {
          return false;
        }
        if (!caseSensitive) {
          source = source.toLowerCase();
          value = value.toLowerCase();
        }
        return source === value;
      },
    };
  };
}

export function includes<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    let { value, caseSensitive } = stringSchema.parse(options);
    return {
      name: `${name} includes ${value}${caseSensitive ? ' (case sensitive)' : ''}`,
      test: (ctx) => {
        let source = getter(ctx);
        if (typeof source !== 'string') {
          return false;
        }
        if (!caseSensitive) {
          source = source.toLowerCase();
          value = value.toLowerCase();
        }
        return source.includes(value);
      },
    };
  };
}

export function startsWith<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    let { value, caseSensitive } = stringSchema.parse(options);
    return {
      name: `${name} starts with ${value}${caseSensitive ? ' (case sensitive)' : ''}`,
      test: (ctx) => {
        let source: string = getter(ctx);
        if (typeof source !== 'string') {
          return false;
        }
        if (!caseSensitive) {
          source = source.toLowerCase();
          value = value.toLowerCase();
        }
        return source.startsWith(value);
      },
    };
  };
}

export function endsWith<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    let { value, caseSensitive } = stringSchema.parse(options);
    return {
      name: `${name} ends with ${value}${caseSensitive ? ' (case sensitive)' : ''}`,
      test: (ctx) => {
        let source: string = getter(ctx);
        if (typeof source !== 'string') {
          return false;
        }
        if (!caseSensitive) {
          source = source.toLowerCase();
          value = value.toLowerCase();
        }
        return source.endsWith(value);
      },
    };
  };
}

const stringArraySchema = z.object({
  value: z.array(z.string()),
  caseSensitive: z.boolean().optional(),
});

export function eqAny<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    let { value, caseSensitive } = stringArraySchema.parse(options);
    return {
      name: `${name} is any of [${value.join(', ')}]${caseSensitive ? ' (case sensitive)' : ''}`,
      test: (ctx) => {
        let source = getter(ctx);
        if (typeof source !== 'string') {
          return false;
        }
        if (!caseSensitive) {
          source = source.toLowerCase();
          value = value.map((v) => v.toLowerCase());
        }
        return value.some((v) => v === source);
      },
    };
  };
}

export function includesAny<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    let { value, caseSensitive } = stringArraySchema.parse(options);
    return {
      name: `${name} includes any of [${value.join(', ')}]${
        caseSensitive ? ' (case sensitive)' : ''
      }`,
      test: (ctx) => {
        let source = getter(ctx);
        if (typeof source !== 'string') {
          return false;
        }
        if (!caseSensitive) {
          source = source.toLowerCase();
          value = value.map((v) => v.toLowerCase());
        }
        return value.some((v) => source!.includes(v));
      },
    };
  };
}

export function includesAll<Ctx extends Context = Context>(
  getter: Getter<Ctx>,
  name?: string
): ConditionFactory<any, Ctx> {
  return (options) => {
    let { value, caseSensitive } = stringArraySchema.parse(options);
    return {
      name: `${name} includes all of [${value.join(', ')}]${
        caseSensitive ? ' (case sensitive)' : ''
      }`,
      test: (ctx) => {
        let source = getter(ctx);
        if (typeof source !== 'string') {
          return false;
        }
        if (!caseSensitive) {
          source = source.toLowerCase();
          value = value.map((v) => v.toLowerCase());
        }
        return value.every((v) => source!.includes(v));
      },
    };
  };
}
