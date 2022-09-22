export async function retry<T extends () => any>(fn: T, num = 3): Promise<Awaited<ReturnType<T>>> {
  return new Promise<Awaited<ReturnType<T>>>(async (resolve, reject) => {
    while (num > 0) {
      try {
        const res = await fn();
        resolve(res as Awaited<ReturnType<T>>);
        num = 0;
      } catch (e) {
        if (!num) reject(e);
      }
      num--;
    }
  });
}
