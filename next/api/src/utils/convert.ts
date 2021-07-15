type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

export function array2map<T, K extends StringKeys<T>>(array: T[], key: K): Record<T[K], T> {
  return array.reduce<Record<T[K], T>>((map, item) => {
    map[item[key]] = item;
    return map;
  }, {});
}
