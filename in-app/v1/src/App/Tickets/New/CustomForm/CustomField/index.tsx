import { JSXElementConstructor, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import { CategoryFieldSchema, FieldType } from '@/api/category';
import style from './index.module.css';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Select } from './Select';
import { CheckboxGroup } from './CheckboxGroup';
import { RadioGroup } from './RadioGroup';
import { Uploader } from './Uploader';

const TOP_LABEL_TYPES: FieldType[] = ['multi-select', 'radios'];
const I18N_KEY_BY_ID: Record<string, string | undefined> = {
  title: 'general.title',
  description: 'general.description',
};

export interface CustomFieldProps extends CategoryFieldSchema {
  htmlId?: string;
}

const components: Record<FieldType, JSXElementConstructor<CustomFieldProps>> = {
  text: Input,
  'multi-line': Textarea,
  dropdown: Select,
  'multi-select': CheckboxGroup,
  radios: RadioGroup,
  file: Uploader,
};

function Unknown({ type }: { type: string }) {
  return <div className="text-red">Unsupported component: {type}</div>;
}

export function CustomField(props: CustomFieldProps) {
  const { id, type, title, required } = props;
  const { t } = useTranslation();

  const alignTop = useMemo(() => TOP_LABEL_TYPES.includes(type), [type]);

  const displayTitle = useMemo(() => {
    const i18nKey = I18N_KEY_BY_ID[id];
    return i18nKey ? t(i18nKey) : title;
  }, [id, title, t]);

  const Component = components[props.type];
  if (!Component) {
    return <Unknown type={props.type} />;
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
