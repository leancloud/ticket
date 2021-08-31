import { ComponentPropsWithoutRef } from 'react';

import { Checkbox } from './Checkbox';
import { Input } from './Input';
import { Label } from './Label';
import { Radio } from './Radio';

export function Form(props: ComponentPropsWithoutRef<'form'>) {
  return <form {...props} />;
}

export default Object.assign(Form, { Checkbox, Input, Label, Radio });
