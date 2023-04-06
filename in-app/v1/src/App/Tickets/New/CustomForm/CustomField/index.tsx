import { JSXElementConstructor, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import style from './index.module.css';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Select } from './Select';
import { CheckboxGroup } from './CheckboxGroup';
import { RadioGroup } from './RadioGroup';
import { Uploader } from './Uploader';
import { NumberInput } from './NumberInput';
import { DateInput } from './Date';

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
  file: Uploader,
  number: NumberInput,
  date: DateInput,
};

function Unknown({ type }: { type: string }) {
  return <div className="text-red">Unsupported component: {type}</div>;
}

export function CustomField(props: CustomFieldProps) {
  const { id, type, title, required } = props;
  const { t } = useTranslation();

  const displayTitle = useMemo(() => {
    const i18nKey = I18N_KEY_BY_ID[id];
    return i18nKey ? t(i18nKey) : title;
  }, [id, title, t]);

  const Component = components[type];
  if (!Component) {
    return <Unknown type={type} />;
  }
  return (
    <>
      <div className="shrink-0 mb-2">
        <label
          className={cx('relative break-words leading-[22px] font-bold', {
            [style.required]: required,
          })}
          htmlFor={`field_${id}`}
        >
          {displayTitle}
        </label>
      </div>
      <Component {...props} htmlId={`field_${id}`} />
    </>
  );
}
