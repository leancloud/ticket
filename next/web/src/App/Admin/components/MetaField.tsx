import { Form, Checkbox, InputNumber } from 'antd';
import { omit } from 'lodash-es';
import { Fragment, ReactNode, useMemo } from 'react';
import { JSONTextarea } from './JSONTextarea';

export type MetaOption =
  | {
      key: string;
      type: 'boolean' | 'number';
      label: string;
    }
  | {
      key: string;
      type: 'component';
      component: ReactNode;
    };

export interface MetaOptionsGroup {
  label: string;
  key: string;
  children: MetaOption[];
}

const isMetaOptionArray = (options: MetaOption[] | MetaOptionsGroup[]): options is MetaOption[] =>
  'type' in options[0];

export interface MetaFieldProps {
  value?: Record<string, any>;
  onChange?: (value: Record<string, any> | undefined) => void;
  options?: MetaOption[] | MetaOptionsGroup[];
}

const MetaOptionsForm = ({
  options,
  value,
  onChange,
}: Omit<MetaFieldProps, 'options'> & { options: MetaOption[] }) => {
  const handleFieldChangeFactory = <E,>(
    field: string,
    getter: (e: E) => boolean | string | number
  ) => (e: E) => {
    const v = getter(e);

    onChange?.({ ...value, [field]: v });
  };

  return (
    <Fragment>
      {options.map((option) =>
        option.type === 'component' ? (
          <Fragment key={option.key}>{option.component}</Fragment>
        ) : (
          <div key={option.key}>
            {option.type === 'boolean' ? (
              <Checkbox
                checked={!!value?.[option.key]}
                onChange={handleFieldChangeFactory(option.key, (e) => e.target.checked)}
              >
                {option.label}
              </Checkbox>
            ) : (
              <InputNumber
                key={option.key}
                value={value?.[option.key]}
                onChange={handleFieldChangeFactory(option.key, Number)}
                controls={false}
                addonBefore={option.label}
              />
            )}
          </div>
        )
      )}
    </Fragment>
  );
};

export const MetaField = ({ value, onChange, options }: MetaFieldProps) => {
  const handleMetaChange = (v: Record<string, any>) => {
    onChange?.({ ...value, ...v });
  };

  const jsonValue = useMemo(
    () =>
      options
        ? omit(
            value,
            isMetaOptionArray(options)
              ? options.map(({ key }) => key)
              : options.flatMap(({ children }) => children.map(({ key }) => key))
          )
        : value,
    [value, options]
  );

  return (
    <Fragment>
      {options?.length &&
        (isMetaOptionArray(options) ? (
          <Form.Item label="额外属性" htmlFor="meta-extra">
            <div id="meta-extra" className="flex flex-col space-y-3">
              <MetaOptionsForm value={value} onChange={onChange} options={options} />
            </div>
          </Form.Item>
        ) : (
          options.map(({ children, label, key }) => (
            <Form.Item label={label} key={key} htmlFor={`meta-extra-${key}`}>
              <div className="flex flex-col space-y-3" id={`meta-extra-${key}`}>
                <MetaOptionsForm value={value} onChange={onChange} options={children} />
              </div>
            </Form.Item>
          ))
        ))}
      <Form.Item label="Meta" htmlFor="meta" help="面向开发者的扩展属性。">
        <JSONTextarea value={jsonValue} onChange={handleMetaChange} id="meta" />
      </Form.Item>
    </Fragment>
  );
};
