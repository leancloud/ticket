import { JSXElementConstructor } from 'react';

import { CategoryFieldSchema, FieldType } from '@/api/category';

import { Input } from './Input';
import { Textarea } from './Textarea';
import { Select } from './Select';
import { CheckboxGroup } from './CheckboxGroup';
import { RadioGroup } from './RadioGroup';
import { Uploader } from './Uploader';

export interface CustomFieldProps extends CategoryFieldSchema {}

const components: Record<FieldType, JSXElementConstructor<CustomFieldProps>> = {
  text: Input,
  'multi-line': Textarea,
  dropdown: Select,
  'multi-select': CheckboxGroup,
  radios: RadioGroup,
  file: Uploader,
};

function Unknown({ type }: { type: string }) {
  return <div className="text-red-500">Unsupported component: {type}</div>;
}

export function CustomField(props: CustomFieldProps) {
  const Component = components[props.type];
  if (!Component) {
    return <Unknown type={props.type} />;
  }
  return <Component {...props} />;
}
