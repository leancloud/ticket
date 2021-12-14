import { JSXElementConstructor } from 'react';

import { CategoryFieldSchema, useCategoryFields } from '@/api/category';
import { Input } from './Fields/Input';
import { Textarea } from './Fields/Textarea';
import { Select } from './Fields/Select';
import { Upload, UploadProps } from './Fields/Upload';
import { CheckboxGroup } from './Fields/CheckboxGroup';
import { RadioGroup } from './Fields/RadioGroup';

interface FieldProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  options?: { title: string; value: string }[];
}

const components: Record<CategoryFieldSchema['type'], JSXElementConstructor<FieldProps>> = {
  text: Input,
  'multi-line': Textarea,
  dropdown: Select,
  file: (props: UploadProps) => <Upload {...props} multiple />,
  'multi-select': CheckboxGroup,
  radios: RadioGroup,
};

function Field(props: CategoryFieldSchema) {
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

export interface CustomFieldsProps {
  categoryId?: string;
}

const presetFieldIds = ['title', 'description'];

export function CustomFields({ categoryId }: CustomFieldsProps) {
  const { data: fields } = useCategoryFields(categoryId!, {
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
    select: (fields) => fields.filter((f) => !presetFieldIds.includes(f.id)),
  });

  return (
    <>
      {fields?.map((field) => (
        <Field key={field.id} {...field} />
      ))}
    </>
  );
}
