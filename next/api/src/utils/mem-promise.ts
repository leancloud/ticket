import { PromiseCache } from './promise-cache';

type AsyncFn<Arg, Ret> = (arg: Arg) => Promise<Ret>;

interface MemPromiseOptions {
  max: number;
  ttl?: number;
}

export default function pmem<T, U>(fn: AsyncFn<T, U>, options: MemPromiseOptions): AsyncFn<T, U> {
  const promiseCache = new PromiseCache<T, U>(options);

  return async (arg: T) => {
    if (promiseCache.has(arg)) {
      return promiseCache.get(arg)!;
    }
    const promise = fn(arg);
    promiseCache.set(arg, promise);
    return promise;
  };
}
