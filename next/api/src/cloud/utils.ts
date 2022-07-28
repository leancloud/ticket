export async function retry(fn: () => Promise<any>, num = 3) {
  return new Promise(async (resolve, reject) => {
    while (num > 0) {
      try {
        const res = await fn();
        resolve(res);
        num = 0;
      } catch (e) {
        if (!num) reject(e);
      }
      num--;
    }
  });
}
