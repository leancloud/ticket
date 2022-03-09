import { JSXElementConstructor, createElement, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { get, set } from 'lodash-es';

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
  const { control, formState, getValues, reset } = useFormContext();
  const typeName = `${path}.type`;
  const typeValue = useWatch({ control, name: typeName });
  const typeError = get(formState.errors, typeName);

  const options = useMemo(() => {
    return Object.entries(config).map(([key, { label }]) => {
      return { label: label ?? key, value: key };
    });
  }, [config]);

  const typeSelect = (
    <Form.Item validateStatus={typeError ? 'error' : undefined}>
      <Controller
        control={control}
        name={typeName}
        rules={{ required: true }}
        render={({ field }) => (
          <Select
            {...field}
            options={options}
            onChange={(type) => {
              const values = getValues();
              set(values, path, { type });
              reset(values);
            }}
            placeholder={typeSelectPlaceholder}
            style={{ width: typeSelectWidth }}
          />
        )}
      />
    </Form.Item>
  );

  const component = typeValue && config[typeValue].component;

  return (
    <>
      {typeSelect}
      {component && createElement(component, { key: typeValue, path })}
    </>
  );
}
