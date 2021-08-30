import { ComponentPropsWithoutRef } from 'react';

import { Input } from './Input';
import { Label } from './Label';
import { Radio } from './Radio';

export function Form(props: ComponentPropsWithoutRef<'form'>) {
  return <form {...props} />;
}

export default Object.assign(Form, { Input, Label, Radio });
