import { PromiseCache } from './promise-cache';

interface MemPromiseOptions {
  max: number;
  ttl?: number;
}

function pmem<T>(fn: () => Promise<T>, options: MemPromiseOptions): () => Promise<T>;
function pmem<T, U>(fn: (arg: U) => Promise<T>, options: MemPromiseOptions): (arg: U) => Promise<T>;
function pmem(fn: (arg?: unknown) => Promise<unknown>, options: MemPromiseOptions) {
  const promiseCache = new PromiseCache(options);

  return async (arg?: unknown) => {
    if (promiseCache.has(arg)) {
      return promiseCache.get(arg)!;
    }
    const promise = fn(arg);
    promiseCache.set(arg, promise);
    return promise;
  };
}

export default pmem;
