import { Input, InputProps } from './Input';
import { Textarea, TextareaProps } from './Textarea';

interface TextProps extends InputProps {
  type: 'text';
}

interface MultiLineProps extends TextareaProps {
  type: 'multi-line';
}

export type FieldProps = TextProps | MultiLineProps;

export function Field(props: FieldProps) {
  switch (props.type) {
    case 'text':
      return <Input {...props} />;
    case 'multi-line':
      return <Textarea {...props} />;
  }
}
