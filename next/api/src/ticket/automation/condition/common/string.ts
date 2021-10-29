import { z } from 'zod';

import { Context } from '../../context';
import { ConditionFactory } from '..';

type Getter<T> = (ctx: Context) => T;

const stringSchema = z.object({
  value: z.string(),
  caseSensitive: z.boolean().optional(),
});

export function eq(getter: Getter<any>, name?: string): ConditionFactory {
  return (options) => {
    let { value, caseSensitive } = stringSchema.parse(options);
    return {
      name: `${name} is ${value}${caseSensitive ? ' (case sensitive)' : ''}`,
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

export function includes(getter: Getter<any>, name?: string): ConditionFactory {
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

export function startsWith(getter: Getter<any>, name?: string): ConditionFactory {
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

export function endsWith(getter: Getter<any>, name?: string): ConditionFactory {
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

export function eqAny(getter: Getter<any>, name?: string): ConditionFactory {
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

export function includesAny(getter: Getter<any>, name?: string): ConditionFactory {
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

export function includesAll(getter: Getter<any>, name?: string): ConditionFactory {
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
