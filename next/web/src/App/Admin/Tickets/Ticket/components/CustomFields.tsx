import { JSXElementConstructor, useState } from 'react';
import { isEmpty } from 'lodash-es';

import { Button, Input, Select } from '@/components/antd';
import { FormField } from './FormField';

interface CustomField {
  id: string;
  type: string;
  label: string;
  options?: { label: string; value: string }[];
}

interface FileFieldValue {
  id: string;
  name: string;
  mime: string;
  url: string;
}

interface CustomFieldValue<T> {
  value: T;
  files?: FileFieldValue[];
}

interface CustomFieldProps<T> {
  options?: CustomField['options'];
  value?: T;
  files?: FileFieldValue[];
  disabled?: boolean;
  onChange: (value: any) => void;
}

const ComponentByFieldType: Record<string, JSXElementConstructor<CustomFieldProps<any>>> = {
  text: TextareaField,
  date: InputField,
  number: InputField,
  'multi-line': TextareaField,
  dropdown: DropdownField,
  radios: DropdownField,
  'multi-select': withProps(DropdownField, { multiple: true }),
  file: FileField,
};

interface CustomFieldsProps {
  fields: CustomField[];
  values: Record<string, CustomFieldValue<any>>;
  disabled?: boolean;
  updating?: boolean;
  onChange: (values: Record<string, any>) => void;
}

export function CustomFields({ fields, values, disabled, updating, onChange }: CustomFieldsProps) {
  const [tempValues, setTempValues] = useState<Record<string, any>>({});

  return (
    <div>
      {fields.map((field) => {
        const Component = ComponentByFieldType[field.type];
        if (!Component) {
          return null;
        }
        return (
          <FormField key={field.id} label={field.label}>
            <Component
              options={field.options}
              value={tempValues[field.id] ?? values[field.id]?.value}
              files={values[field.id]?.files}
              disabled={disabled}
              onChange={(value) => setTempValues({ ...tempValues, [field.id]: value })}
            />
          </FormField>
        );
      })}
      {!isEmpty(tempValues) && (
        <Button loading={updating} onClick={() => onChange(tempValues)}>
          保存
        </Button>
      )}
    </div>
  );
}

function InputField({ value, disabled, onChange }: CustomFieldProps<string>) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
}

function TextareaField({ value, disabled, onChange }: CustomFieldProps<string>) {
  return (
    <Input.TextArea
      autoSize
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

function DropdownField({
  options,
  value,
  multiple,
  disabled,
  onChange,
}: CustomFieldProps<string> & { multiple?: boolean }) {
  return (
    <Select
      className="w-full"
      mode={multiple ? 'multiple' : undefined}
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

function FileField({ files }: CustomFieldProps<string[]>) {
  if (!files || files.length === 0) {
    return <div className="w-full text-center text-sm">暂无数据</div>;
  }
  return (
    <div className="flex flex-col items-start gap-0.5">
      {files.map((file) => (
        <a
          key={file.id}
          className="max-w-full truncate"
          href={file.url}
          target="_blank"
          title={file.name}
        >
          {file.name}
        </a>
      ))}
    </div>
  );
}

type PartialSome<T, K extends keyof T> = Omit<T, K> &
  {
    [key in K]?: T[K];
  };

function withProps<P extends Record<string, any>, K extends keyof P>(
  Component: JSXElementConstructor<P>,
  presetProps: {
    [key in K]: P[K];
  }
): JSXElementConstructor<PartialSome<P, K>> {
  return (props: any) => <Component {...presetProps} {...props} />;
}
