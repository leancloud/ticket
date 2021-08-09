import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ControlRef, Field } from './Field';
import { Group } from './Group';

interface BaseTemplate<T extends string> {
  type: T;
  name: string;
  title?: string;
  required?: boolean;
}

interface Option {
  title: string;
  value: string;
}

interface TextTemplate extends BaseTemplate<'text'> {
  placeholder?: string;
}

interface MultiLineTemplate extends BaseTemplate<'multi-line'> {
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

interface RadiosTemplate extends BaseTemplate<'radios'> {
  options: Option[];
}

interface MultiSelectTemplate extends BaseTemplate<'multi-select'> {
  options: Option[];
}

interface DropdownTemplate extends BaseTemplate<'dropdown'> {
  options: Option[];
}

interface FileTemplate extends BaseTemplate<'file'> {}

export type FieldTemplate =
  | TextTemplate
  | MultiLineTemplate
  | RadiosTemplate
  | MultiSelectTemplate
  | DropdownTemplate
  | FileTemplate;

function omitUndefined(data: Record<string, any>): Record<string, any> {
  const nextData: typeof data = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      nextData[key] = value;
    }
  });
  return nextData;
}

export function useForm(templates: FieldTemplate[]) {
  const { t } = useTranslation();
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const $refs = useRef<Record<string, ControlRef>>({});

  const element = (
    <>
      {templates.map(({ name, title, ...rest }) => (
        <Group
          key={name}
          title={title ?? name}
          required={rest.required}
          labelAtTop={rest.type === 'multi-select' || rest.type === 'radios'}
        >
          <Field
            {...rest}
            ref={(current) => ($refs.current[name] = current!)}
            onChange={(v: any) => setData((prev) => omitUndefined({ ...prev, [name]: v }))}
            error={errors[name]}
          />
        </Group>
      ))}
    </>
  );

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    let count = 0;
    templates.forEach((tmpl) => {
      let error: string | undefined;
      switch (tmpl.type) {
        case 'text':
        case 'multi-line':
        case 'radios':
        case 'dropdown':
          if (tmpl.required && !data[tmpl.name]) {
            error = t('validation.required');
          }
          break;
        case 'multi-select':
          if (tmpl.required && (!data[tmpl.name] || data[tmpl.name].length === 0)) {
            error = t('validation.required');
          }
          break;
      }
      if (error) {
        nextErrors[tmpl.name] = error;
        if (count === 0) {
          $refs.current[tmpl.name]?.focus();
        }
        count++;
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  return { element, validate, data };
}
