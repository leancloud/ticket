import { z } from 'zod';

import { Context } from '../..';
import { ConditionFactory } from '..';

type Getter<T> = (ctx: Context) => T;

const stringSchema = z.object({
  value: z.string(),
  caseSensitive: z.boolean().optional(),
});

export function eq(getter: Getter<any>): ConditionFactory {
  return (options) => {
    let { value, caseSensitive } = stringSchema.parse(options);
    return {
      options,
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

export function includes(getter: Getter<any>): ConditionFactory {
  return (options) => {
    let { value, caseSensitive } = stringSchema.parse(options);
    return {
      options,
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

export function startsWith(getter: Getter<any>): ConditionFactory {
  return (options) => {
    let { value, caseSensitive } = stringSchema.parse(options);
    return {
      options,
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

export function endsWith(getter: Getter<any>): ConditionFactory {
  return (options) => {
    let { value, caseSensitive } = stringSchema.parse(options);
    return {
      options,
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

export function eqAny(getter: Getter<any>): ConditionFactory {
  return (options) => {
    let { value, caseSensitive } = stringArraySchema.parse(options);
    return {
      options,
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

export function includesAny(getter: Getter<any>): ConditionFactory {
  return (options) => {
    let { value, caseSensitive } = stringArraySchema.parse(options);
    return {
      options,
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

export function includesAll(getter: Getter<any>): ConditionFactory {
  return (options) => {
    let { value, caseSensitive } = stringArraySchema.parse(options);
    return {
      options,
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
