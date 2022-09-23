export async function retry<T extends () => unknown>(
  fn: T,
  num = 3
): Promise<Awaited<ReturnType<T>>> {
  let retryCount = 0;
  while (retryCount <= num) {
    try {
      const res = await fn();
      return res as Awaited<ReturnType<T>>;
    } catch (err) {
      retryCount += 1;
      if (retryCount > num) throw err;
      console.info(`${String(err)}, retry ${retryCount}`);
    }
  }
  throw 'retry: should not reach here';
}
