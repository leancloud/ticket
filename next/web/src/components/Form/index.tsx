import { ComponentPropsWithoutRef } from 'react';

import { Checkbox } from './Checkbox';
import { Input } from './Input';
import { Label } from './Label';
import { Radio } from './Radio';
import { Textarea } from './Textarea';

export * from './Checkbox';
export * from './Input';
export * from './Label';
export * from './Radio';
export * from './Textarea';

export function Form(props: ComponentPropsWithoutRef<'form'>) {
  return <form {...props} />;
}

export default Object.assign(Form, { Checkbox, Input, Label, Radio, Textarea });
