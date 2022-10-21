import { JSXElementConstructor } from 'react';

import { Input } from './Fields/Input';
import { Textarea } from './Fields/Textarea';
import { Select } from './Fields/Select';
import { Upload, UploadProps } from './Fields/Upload';
import { CheckboxGroup } from './Fields/CheckboxGroup';
import { RadioGroup } from './Fields/RadioGroup';

export interface FieldConfig {
  id: string;
  type: 'text' | 'multi-line' | 'dropdown' | 'multi-select' | 'radios' | 'file';
  title: string;
  description: string;
  required: boolean;
  options?: { title: string; value: string }[];
}

interface FieldProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  options?: FieldConfig['options'];
}

const components: Record<FieldConfig['type'], JSXElementConstructor<FieldProps>> = {
  text: Input,
  'multi-line': Textarea,
  dropdown: Select,
  file: (props: UploadProps) => <Upload {...props} multiple />,
  'multi-select': CheckboxGroup,
  radios: RadioGroup,
};

export function Field(props: FieldConfig) {
  const Component = components[props.type];
  if (!Component) {
    return <div className="text-red-500">Unknown field type: {props.type}</div>;
  }
  return (
    <Component
      name={props.id}
      label={props.title}
      description={props.description}
      required={props.required}
      options={props.options}
    />
  );
}
