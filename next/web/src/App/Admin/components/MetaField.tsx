import { Form, Checkbox, InputNumber } from 'antd';
import { omit } from 'lodash-es';
import { useMemo } from 'react';
import { JSONTextarea } from './JSONTextarea';

export interface MetaOptions {
  key: string;
  type: 'boolean' | 'number';
  label: string;
}

export interface MetaFieldProps {
  value?: Record<string, any>;
  onChange?: (value: Record<string, any> | undefined) => void;
  options?: MetaOptions[];
}

export const MetaField = ({ value, onChange, options }: MetaFieldProps) => {
  const handleMetaChange = (v: Record<string, any>) => {
    onChange?.({ ...value, ...v });
  };

  const handleFieldChangeFactory = <E,>(
    field: string,
    getter: (e: E) => boolean | string | number
  ) => (e: E) => {
    const v = getter(e);

    onChange?.({ ...value, [field]: v });
  };

  const jsonValue = useMemo(
    () =>
      options
        ? omit(
            value,
            options.map(({ key }) => key)
          )
        : value,
    [value, options]
  );

  return (
    <>
      {options && (
        <Form.Item label="额外属性" htmlFor="meta-extra">
          <div id="meta-extra" className="flex flex-col">
            <div className="mb-2 space-x-1">
              {options
                .filter(({ type }) => type === 'boolean')
                .map(({ key, label }) => (
                  <Checkbox
                    key={key}
                    checked={!!value?.[key]}
                    onChange={handleFieldChangeFactory(key, (e) => e.target.checked)}
                  >
                    {label}
                  </Checkbox>
                ))}
            </div>
            <div>
              {options
                .filter(({ type }) => type === 'number')
                .map(({ key, label }) => (
                  <InputNumber
                    key={key}
                    value={value?.[key]}
                    onChange={handleFieldChangeFactory(key, Number)}
                    controls={false}
                    addonBefore={label}
                  />
                ))}
            </div>
          </div>
        </Form.Item>
      )}
      <Form.Item label="Meta" htmlFor="meta" help="面向开发者的扩展属性。">
        <JSONTextarea value={jsonValue} onChange={handleMetaChange} id="meta" />
      </Form.Item>
    </>
  );
};
