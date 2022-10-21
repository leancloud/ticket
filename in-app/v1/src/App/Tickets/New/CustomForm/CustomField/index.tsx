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

type FieldType = 'text' | 'multi-line' | 'dropdown' | 'multi-select' | 'radios' | 'file';

const TOP_LABEL_TYPES: FieldType[] = ['multi-select', 'radios'];

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

  const Component = components[type];
  if (!Component) {
    return <Unknown type={type} />;
  }
  return (
    <div className="flex flex-col sm:flex-row mb-5 last:mb-0">
      <div className="shrink-0 mb-2 sm:mb-0 sm:w-[72px] sm:mr-2">
        <label
          className={cx('relative break-words', {
            [style.required]: required,
            'sm:top-[7px]': !alignTop,
          })}
          htmlFor={`field_${id}`}
        >
          {displayTitle}
        </label>
      </div>
      <div className="grow">
        <Component {...props} htmlId={`field_${id}`} />
      </div>
    </div>
  );
}
