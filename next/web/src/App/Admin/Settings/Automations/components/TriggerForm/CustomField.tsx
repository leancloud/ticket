import { JSXElementConstructor, createElement, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Form, Select } from '@/components/antd';

export interface Config {
  [key: string]: {
    label?: string;
    component?: JSXElementConstructor<{ path: string }>;
  };
}

export interface CustomFieldProps {
  config: Config;
  path: string;
  typeSelectPlaceholder?: string;
  typeSelectWidth?: number;
}

export function CustomField({
  config,
  path,
  typeSelectPlaceholder,
  typeSelectWidth = 180,
}: CustomFieldProps) {
  const { setValue } = useFormContext();
  const typeName = `${path}.type`;
  const typeValue = useWatch({ name: typeName });

  const options = useMemo(() => {
    return Object.entries(config).map(([key, { label }]) => {
      return { label: label ?? key, value: key };
    });
  }, [config]);

  const typeSelect = (
    <Controller
      name={typeName}
      rules={{ required: true }}
      render={({ field, fieldState: { error } }) => (
        <Form.Item validateStatus={error ? 'error' : undefined}>
          <Select
            {...field}
            options={options}
            onChange={(type) => setValue(path, { type })}
            placeholder={typeSelectPlaceholder}
            style={{ width: typeSelectWidth }}
          />
        </Form.Item>
      )}
    />
  );

  const component = typeValue && config[typeValue].component;

  return (
    <>
      {typeSelect}
      {component && createElement(component, { path })}
    </>
  );
}
