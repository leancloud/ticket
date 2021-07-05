import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';

import { Field } from './Fields';

interface BaseTemplate<T extends string> {
  type: T;
  name: string;
  title?: string;
}

interface TextTemplate extends BaseTemplate<'text'> {
  placeholder?: string;
  required?: boolean;
}

interface MultiLineTemplate extends BaseTemplate<'multi-line'> {
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
}

type FieldTemplate = TextTemplate | MultiLineTemplate;

export interface FormProps {
  template: FieldTemplate[];
}

export function Form({ template }: FormProps) {
  const [data, setData] = useState<Record<string, any>>({});

  return (
    <>
      {template.map(({ name, title, ...rest }) => {
        return (
          <div key={name} className="flex mb-5">
            <label className="flex-shrink-0 w-20 mt-1.5">{title ?? name}</label>
            <div className="flex-grow">
              <Field
                {...rest}
                value={data[name]}
                onChange={(v) => setData((prev) => ({ ...prev, [name]: v }))}
              />
            </div>
          </div>
        );
      })}
    </>
  );
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
      const input = $container.current.querySelector('input,textarea');
      if (input) {
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

export interface UseFormOptions {
  template: FieldTemplate[];
}

export function useForm({ template }: UseFormOptions) {
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const element = (
    <>
      {template.map(({ name, title, ...rest }) => (
        <FormGroup
          key={name}
          title={title ?? name}
          required={rest.required}
          controlId={`ticket_${name}`}
        >
          <Field
            {...rest}
            value={data[name]}
            onChange={(v) => setData((prev) => ({ ...prev, [name]: v }))}
            error={errors[name]}
          />
        </FormGroup>
      ))}
    </>
  );

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    template.forEach((tmpl) => {
      switch (tmpl.type) {
        case 'text':
        case 'multi-line':
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
