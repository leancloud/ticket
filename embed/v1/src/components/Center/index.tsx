import { ReactNode } from 'react';

export interface CenterProps {
  children: ReactNode;
}

export function Center({ children }: CenterProps) {
  return <div className="flex justify-center items-center h-full">{children}</div>;
}
