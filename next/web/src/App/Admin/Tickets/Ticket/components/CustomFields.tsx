import { JSXElementConstructor, useMemo, useState } from 'react';
import { isEmpty } from 'lodash-es';
import Handlebars from 'handlebars';
import DOMPurify from 'dompurify';

import { Button, Input, Select } from '@/components/antd';
import { FormField } from './FormField';
import { ErrorBoundary } from 'react-error-boundary';
import { UserSchema } from '@/api/user';

interface CustomField {
  id: string;
  type: string;
  label: string;
  options?: { label: string; value: string }[];
  previewTemplate?: string;
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
  user?: UserSchema;
}

export function CustomFields({
  fields,
  values,
  disabled,
  updating,
  onChange,
  user,
}: CustomFieldsProps) {
  const [tempValues, setTempValues] = useState<Record<string, any>>({});

  return (
    <div>
      {fields.map((field) => {
        const Component = ComponentByFieldType[field.type];
        if (!Component) {
          return null;
        }

        const contentNode = (
          <Component
            options={field.options}
            value={tempValues[field.id] ?? values[field.id]?.value}
            files={values[field.id]?.files}
            disabled={disabled}
            onChange={(value) => setTempValues({ ...tempValues, [field.id]: value })}
          />
        );

        let previewNode;
        const { previewTemplate, id } = field;
        const value = values[id]?.value;
        const DEFAULT_CONTENT_PLACEHOLDER = '#DEFAULT#';
        if (previewTemplate) {
          const showPreviewAnyway = previewTemplate.startsWith('!');
          if (showPreviewAnyway || value !== undefined) {
            const template = showPreviewAnyway ? previewTemplate.slice(1) : previewTemplate;
            previewNode = (
              <ErrorBoundary
                fallbackRender={({ error }) => (
                  <div className="text-red-500">Render preview template error: {error.message}</div>
                )}
              >
                {/* {template.startsWith(DEFAULT_CONTENT_PLACEHOLDER) && defaultContent} */}
                <CustomFieldPreview
                  template={template
                    .replace(RegExp(`^${DEFAULT_CONTENT_PLACEHOLDER}`), '')
                    .replace(RegExp(`${DEFAULT_CONTENT_PLACEHOLDER}$`), '')}
                  value={value}
                  user={user}
                />
                {/* {template.endsWith(DEFAULT_CONTENT_PLACEHOLDER) && defaultContent} */}
              </ErrorBoundary>
            );
          }
        }

        return (
          <FormField key={field.id} label={field.label}>
            {previewNode ? (
              <>
                {previewNode}
                <details className='text-sm'>
                  <summary>编辑</summary>
                  {contentNode}
                </details>
              </>
            ) : (
              contentNode
            )}
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

function CustomFieldPreview({
  template,
  value,
  user,
}: {
  template: string;
  value: string;
  user?: UserSchema;
}) {
  const tpl = useMemo(() => (template ? Handlebars.compile(template) : undefined), [template]);
  const previewHTML = useMemo(() => {
    let parsedValue = value;
    try {
      parsedValue = JSON.parse(value);
    } catch (error) {
      // ignore the error
    }
    return tpl
      ? DOMPurify.sanitize(tpl({ value: parsedValue, user }), { ADD_TAGS: ['iframe'] })
      : undefined;
  }, [tpl, value, user]);
  return <p dangerouslySetInnerHTML={{ __html: previewHTML ?? '' }} />;
}
