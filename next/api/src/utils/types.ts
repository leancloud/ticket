export type ExtractArrayType<T extends ArrayLike<unknown>> = T extends ArrayLike<infer Res>
  ? Res
  : never;
