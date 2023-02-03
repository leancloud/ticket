export type ArrayType<T extends unknown[] | ReadonlyArray<unknown>> = T extends
  | Array<infer R>
  | ReadonlyArray<infer R>
  ? R
  : never;
