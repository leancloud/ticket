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
        'w-full px-2 py-1',
        'border rounded focus:border-tapBlue-600 focus:ring-tapBlue-600 focus:ring-1',
        props.className
      )}
      placeholder={props.placeholder}
    />
  );
}
