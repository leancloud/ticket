import { ReactNode } from 'react';

export interface FormFieldProps {
  label: ReactNode;
  children?: ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <div className="pb-2">{label}</div>
      <div>{children}</div>
    </div>
  );
}
