interface Desensitizer {
  pattern: RegExp;
  replace: (substr: string) => string;
}

const desensitizers: Desensitizer[] = [
  {
    pattern: /\d{5,}/g,
    replace: (s) => '*'.repeat(s.length),
  },
];

export function desensitize(value: string) {
  for (const { pattern, replace } of desensitizers) {
    value = value.replace(pattern, replace);
  }
  return value;
}
