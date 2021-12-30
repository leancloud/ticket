import { ExoticComponent, createElement, forwardRef } from 'react';

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

export interface ControlRef {
  focus: () => void;
}

const COMPONENTS: Record<string, ExoticComponent<any> | undefined> = {
  text: Input,
  dropdown: Dropdown,
  radios: RadioGroup,
  'multi-select': CheckboxGroup,
  'multi-line': Textarea,
  file: Uploader,
};

function Unknown({ type }: { type: string }) {
  return <div className="text-red">Unsupported component: {type}</div>;
}

export const Field = forwardRef<ControlRef, FieldProps>(({ type, ...props }, ref) => {
  const Component = COMPONENTS[type];
  if (!Component) {
    return <Unknown type={type} />;
  }
  return createElement(Component, { ...props, ref });
});
