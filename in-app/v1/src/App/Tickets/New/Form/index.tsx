import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';

import { Field } from './Field';

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

export type FromGroupProps = JSX.IntrinsicElements['div'] & {
  title?: string;
  controlId?: string;
  required?: boolean;
};

export function FormGroup({ title, controlId, required, children, ...props }: FromGroupProps) {
  const $container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (controlId && $container.current) {
      const input = $container.current.querySelector('input[type="text"],textarea');
      if (input && !input.id) {
        input.id = controlId;
      }
    }
  }, [controlId]);

  return (
    <div
      {...props}
      className={classNames(props.className, 'flex flex-col sm:flex-row mb-5')}
      ref={$container}
    >
      <div className="flex-shrink-0 sm:w-20 mb-1.5 sm:mb-0 py-1">
        <label htmlFor={controlId}>
          {title}
          {required && <span className="ml-1 text-red-500 select-none">*</span>}
        </label>
      </div>
      <div className="flex-grow">{children}</div>
    </div>
  );
}

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

  const element = (
    <>
      {templates.map(({ name, title, ...rest }) => (
        <FormGroup
          key={name}
          title={title ?? name}
          required={rest.required}
          controlId={`ticket_${name}`}
        >
          <Field
            {...rest}
            onChange={(v: any) => setData((prev) => omitUndefined({ ...prev, [name]: v }))}
            error={errors[name]}
          />
        </FormGroup>
      ))}
    </>
  );

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    templates.forEach((tmpl) => {
      switch (tmpl.type) {
        case 'text':
        case 'multi-line':
        case 'radios':
        case 'dropdown':
          if (tmpl.required && !data[tmpl.name]) {
            nextErrors[tmpl.name] = t('validation.required');
          }
          break;
        case 'multi-select':
          if (tmpl.required && (!data[tmpl.name] || data[tmpl.name].length === 0)) {
            nextErrors[tmpl.name] = t('validation.required');
          }
          break;
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  return { element, validate, data };
}
