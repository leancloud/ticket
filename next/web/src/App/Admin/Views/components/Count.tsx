import { useMemo } from 'react';

interface CountProps {
  value: number;
}

export function Count({ value }: CountProps) {
  const [humanValue, unit] = useMemo<[string, string | undefined]>(() => {
    if (value >= 1000) {
      return [(value / 1000).toFixed(1), 'K'];
    }
    return [value.toString(), undefined];
  }, [value]);

  return (
    <span title={value.toString()}>
      {humanValue}
      {unit}
    </span>
  );
}
