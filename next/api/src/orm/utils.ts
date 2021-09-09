export type KeysOfType<O, T> = { [K in keyof O]: O[K] extends T ? K : never }[keyof O];

export type Flat<T> = T extends (infer P)[] ? P : T;
