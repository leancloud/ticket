import { ComponentPropsWithoutRef } from 'react';

import { Input } from './Input';
import { Label } from './Label';
import { Radio } from './Radio';
import { Textarea } from './Textarea';

export * from './Input';
export * from './Label';
export * from './Radio';
export * from './Textarea';

export function Form(props: ComponentPropsWithoutRef<'form'>) {
  return <form {...props} />;
}

export default Object.assign(Form, { Input, Label, Radio, Textarea });
