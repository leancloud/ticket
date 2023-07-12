import { Form, Checkbox, InputNumber, Input } from 'antd';
import { omit } from 'lodash-es';
import { ReactNode, useMemo } from 'react';
import { JSONTextarea } from './JSONTextarea';

export type MetaOption<T = any> = (
  | {
      type: 'boolean' | 'number' | 'text';
      label: string;
    }
  | {
      type: 'component';
      component: ReactNode;
    }
) & { key: string; predicate?: (data: T) => boolean; description?: string };

export interface MetaOptionsGroup<T = any> {
  label: string;
  key: string;
  children: MetaOption<T>[];
}

type SchemaWithMeta = { meta?: Record<string, any> };

const isMetaOptionArray = (options: MetaOption[] | MetaOptionsGroup[]): options is MetaOption[] =>
  'type' in options[0];

export interface MetaFieldProps<T extends SchemaWithMeta> {
  value?: T['meta'];
  record?: T;
  onChange?: (value: Record<string, any> | undefined) => void;
  options?: MetaOption[] | MetaOptionsGroup[];
}

const MetaOptionsForm = <T extends SchemaWithMeta>({
  options,
  value,
  record,
  onChange,
}: Omit<MetaFieldProps<T>, 'options'> & { options: MetaOption<T>[] }) => {
  const handleFieldChangeFactory = <E,>(
    field: string,
    getter: (e: E) => boolean | string | number
  ) => (e: E) => {
    const v = getter(e);

    onChange?.({ ...value, [field]: v });
  };

  return (
    <>
      {options
        .filter(({ predicate }) => !record || !predicate || predicate(record))
        .map((option) => (
          <Form.Item key={option.key} help={option.description} className="!mb-0">
            {option.type === 'component' ? (
              option.component
            ) : (
              <div>
                {option.type === 'boolean' ? (
                  <Checkbox
                    checked={!!value?.[option.key]}
                    onChange={handleFieldChangeFactory(option.key, (e) => e.target.checked)}
                  >
                    {option.label}
                  </Checkbox>
                ) : option.type === 'number' ? (
                  <InputNumber
                    key={option.key}
                    value={value?.[option.key]}
                    onChange={handleFieldChangeFactory(option.key, Number)}
                    controls={false}
                    addonBefore={option.label}
                  />
                ) : (
                  <Input
                    key={option.key}
                    value={value?.[option.key]}
                    onChange={handleFieldChangeFactory(option.key, (e) => e.target.value)}
                    addonBefore={option.label}
                  />
                )}
              </div>
            )}
          </Form.Item>
        ))}
    </>
  );
};

export const MetaField = <T extends SchemaWithMeta>({
  value,
  onChange,
  options,
  record,
}: MetaFieldProps<T>) => {
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
    <>
      {options?.length &&
        (isMetaOptionArray(options) ? (
          <Form.Item label="额外属性" htmlFor="meta-extra" className="!mb-4">
            <div id="meta-extra" className="flex flex-col space-y-3">
              <MetaOptionsForm
                value={value}
                onChange={onChange}
                options={options}
                record={record}
              />
            </div>
          </Form.Item>
        ) : (
          options.map(({ children, label, key }) => (
            <Form.Item label={label} key={key} htmlFor={`meta-extra-${key}`} className="!mb-4">
              <div className="flex flex-col space-y-3" id={`meta-extra-${key}`}>
                <MetaOptionsForm
                  value={value}
                  onChange={onChange}
                  options={children}
                  record={record}
                />
              </div>
            </Form.Item>
          ))
        ))}
      <Form.Item label="Meta" htmlFor="meta" help="面向开发者的扩展属性。">
        <JSONTextarea value={jsonValue} onChange={handleMetaChange} id="meta" />
      </Form.Item>
    </>
  );
};
