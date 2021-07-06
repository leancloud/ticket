import { createElement } from 'react';

import { Input, InputProps } from './Input';
import { Dropdown, DropdownProps } from './Dropdown';
import { CheckboxGroup, CheckboxGroupProps } from './CheckboxGroup';
import { RadioGroup, RadioGroupProps } from './RadioGroup';
import { Textarea, TextareaProps } from './Textarea';

type AddType<P extends {}, T extends string> = P & { type: T };

export type FieldProps =
  | AddType<InputProps, 'text'>
  | AddType<DropdownProps, 'dropdown'>
  | AddType<RadioGroupProps, 'radios'>
  | AddType<CheckboxGroupProps, 'multi-select'>
  | AddType<TextareaProps, 'multi-line'>;

const COMPONENTS: Record<FieldProps['type'], (...args: any[]) => JSX.Element> = {
  text: Input,
  dropdown: Dropdown,
  radios: RadioGroup,
  'multi-select': CheckboxGroup,
  'multi-line': Textarea,
};

export function Field({ type, ...props }: FieldProps) {
  return createElement(COMPONENTS[type], { ...props });
}
