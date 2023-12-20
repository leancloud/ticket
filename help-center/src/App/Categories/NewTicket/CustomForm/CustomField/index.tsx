import { JSXElementConstructor, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Select } from './Select';
import { CheckboxGroup } from './CheckboxGroup';
import { RadioGroup } from './RadioGroup';
import { Upload } from './Upload';
import { Number } from './Number';
import { Date } from './Date';

export type FieldType =
  | 'text'
  | 'multi-line'
  | 'dropdown'
  | 'multi-select'
  | 'radios'
  | 'file'
  | 'number'
  | 'date';

const I18N_KEY_BY_ID: Record<string, string | undefined> = {
  title: 'general.title',
  description: 'general.description',
};

export interface CustomFieldConfig {
  id: string;
  type: FieldType;
  title: string;
  description?: string;
  required: boolean;
  options?: { title: string; value: string }[];
  pattern?: string;
}

export interface CustomFieldProps extends CustomFieldConfig {
  htmlId?: string;
}

const components: Record<FieldType, JSXElementConstructor<CustomFieldProps>> = {
  text: Input,
  'multi-line': Textarea,
  dropdown: Select,
  'multi-select': CheckboxGroup,
  radios: RadioGroup,
  file: Upload,
  number: Number,
  date: Date,
};

export function CustomField(props: CustomFieldProps) {
  const { id, type, title } = props;
  const { t } = useTranslation();

  const displayTitle = useMemo(() => {
    const i18nKey = I18N_KEY_BY_ID[id];
    return i18nKey ? t(i18nKey) : title;
  }, [id, title, t]);

  const Component = components[type];
  if (!Component) {
    return null;
  }
  return (
    <>
      <Component {...props} htmlId={`field_${id}`} title={displayTitle} />
    </>
  );
}
