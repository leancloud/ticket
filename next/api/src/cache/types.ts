export type Fetcher<T> = (id: string) => Promise<T>;
