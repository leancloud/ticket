import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';

import { Field } from './Field';

interface BaseTemplate<T extends string> {
  type: T;
  name: string;
  title?: string;
  required?: boolean;
  defaultValue?: any;
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
  options: string[];
}

interface MultiSelectTemplate extends BaseTemplate<'multi-select'> {
  options: string[];
}

interface DropdownTemplate extends BaseTemplate<'dropdown'> {
  options: string[];
}

export type FieldTemplate =
  | TextTemplate
  | MultiLineTemplate
  | RadiosTemplate
  | MultiSelectTemplate
  | DropdownTemplate;

function getDefaultValues(templates: FieldTemplate[]): Record<string, any> {
  return templates.reduce<Record<string, any>>((defaultValues, tmpl) => {
    if (tmpl.defaultValue !== undefined) {
      defaultValues[tmpl.name] = tmpl.defaultValue;
    }
    return defaultValues;
  }, {});
}

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
      <div className="flex-shrink-0 w-20 mb-1.5 sm:mb-0 sm:mt-1.5">
        <label htmlFor={controlId}>
          {title}
          {required && <span className="ml-1 text-red-500 select-none">*</span>}
        </label>
      </div>
      <div className="flex-grow">{children}</div>
    </div>
  );
}

export function useForm(templates: FieldTemplate[]) {
  const [data, setData] = useState<Record<string, any>>({});
  useEffect(() => setData(getDefaultValues(templates)), [templates]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  console.log(data);

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
            value={data[name]}
            onChange={(v: any) => setData((prev) => ({ ...prev, [name]: v }))}
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
          if (tmpl.required && !data[tmpl.name]) {
            nextErrors[tmpl.name] = '该内容不能为空';
          }
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  return { element, validate, data };
}
