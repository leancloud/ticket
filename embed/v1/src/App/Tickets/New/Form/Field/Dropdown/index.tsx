import { Dropdown as Dropdown_, DropdownProps as DropdownProps_ } from 'components/Form';

export interface DropdownProps extends Required<DropdownProps_> {
  error?: string;
}

export function Dropdown({ error, ...props }: DropdownProps) {
  return <Dropdown_ {...props} />;
}
