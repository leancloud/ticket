import { Input, InputProps } from './Input';
import { Textarea, TextareaProps } from './Textarea';
import { RadioGroup, RadioGroupProps } from './RadioGroup';
import { CheckboxGroup, CheckboxGroupProps } from './CheckboxGroup';
import { Dropdown, DropdownProps as DropdownProps_ } from './Dropdown';

interface TextProps extends InputProps {
  type: 'text';
}

interface MultiLineProps extends TextareaProps {
  type: 'multi-line';
}

interface RadiosProps extends RadioGroupProps {
  type: 'radios';
}

interface MultiSelectProps extends CheckboxGroupProps {
  type: 'multi-select';
}

interface DropdownProps extends DropdownProps_ {
  type: 'dropdown';
}

export type FieldProps =
  | TextProps
  | MultiLineProps
  | RadiosProps
  | MultiSelectProps
  | DropdownProps;

export function Field(props: FieldProps) {
  switch (props.type) {
    case 'text':
      return <Input {...props} />;
    case 'multi-line':
      return <Textarea {...props} />;
    case 'radios':
      return <RadioGroup {...props} />;
    case 'multi-select':
      return <CheckboxGroup {...props} />;
    case 'dropdown':
      return <Dropdown {...props} />;
  }
}
