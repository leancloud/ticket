import classNames from 'classnames';
import { useState } from 'react';

type IntrinsicTextareaProps = JSX.IntrinsicElements['textarea'];

export interface TextareaProps extends IntrinsicTextareaProps {
  maxLength?: number;
}

export function Textarea(props: TextareaProps) {
  return (
    <textarea
      {...props}
      className={classNames(
        props.className,
        'w-full px-2 py-1',
        'border rounded focus:border-tapBlue-600 focus:ring-tapBlue-600 focus:ring-1'
      )}
      placeholder={props.placeholder}
    />
  );
}

function getValue(value: IntrinsicTextareaProps['value']): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value + '';
  }
  return value.join(',');
}

export function withMaxLength(maxLength: number, Component: typeof Textarea) {
  return (props: TextareaProps) => {
    const [value, setValue] = useState(getValue(props.value));
    if (props.value !== undefined) {
      setValue(getValue(props.value));
    }

    const handleChange: IntrinsicTextareaProps['onChange'] = (e) => {
      setValue(e.target.value);
      props.onChange?.(e);
    };

    return (
      <div>
        <Component {...props} value={value} onChange={handleChange} />
        <div>
          {value.length}/{maxLength}
        </div>
      </div>
    );
  };
}
