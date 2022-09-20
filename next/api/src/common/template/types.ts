export interface Template<T> {
  parse: () => boolean;
  getVariableNames: () => string[];
  render: (values: Record<string, string | undefined>) => T;
}
