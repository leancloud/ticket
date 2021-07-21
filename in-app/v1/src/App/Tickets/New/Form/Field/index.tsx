import { createElement } from 'react';

import { Input, InputProps } from './Input';
import { Dropdown, DropdownProps } from './Dropdown';
import { CheckboxGroup, CheckboxGroupProps } from './CheckboxGroup';
import { RadioGroup, RadioGroupProps } from './RadioGroup';
import { Textarea, TextareaProps } from './Textarea';
import { Uploader, UploaderProps } from './Uploader';

type AddType<P extends {}, T extends string> = P & { type: T };

export type FieldProps =
  | AddType<InputProps, 'text'>
  | AddType<DropdownProps, 'dropdown'>
  | AddType<RadioGroupProps, 'radios'>
  | AddType<CheckboxGroupProps, 'multi-select'>
  | AddType<TextareaProps, 'multi-line'>
  | AddType<UploaderProps, 'file'>;

const COMPONENTS: Record<string, ((...args: any[]) => JSX.Element) | undefined> = {
  text: Input,
  dropdown: Dropdown,
  radios: RadioGroup,
  'multi-select': CheckboxGroup,
  'multi-line': Textarea,
  file: Uploader,
};

function Unknown({ type }: { type: string }) {
  return <div className="text-red-500">Unsupported component: {type}</div>;
}

export function Field({ type, ...props }: FieldProps) {
  const Component = COMPONENTS[type];
  if (!Component) {
    return <Unknown type={type} />;
  }
  return createElement(Component, { ...props });
}
