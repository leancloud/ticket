import {
  ComponentPropsWithoutRef,
  Fragment,
  JSXElementConstructor,
  createElement,
  useMemo,
} from 'react';
import { BiTrash } from 'react-icons/bi';
import { RiAddCircleFill } from 'react-icons/ri';
import cx from 'classnames';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { get } from 'lodash-es';

import { Form, Radio, Select } from '@/components/antd';
import style from './index.module.css';

type RootConditionType = 'all' | 'any';

interface TypeRadioGroupProps {
  type: RootConditionType;
  onChange: (type: RootConditionType) => void;
}

function TypeRadioGroup({ type, onChange }: TypeRadioGroupProps) {
  return (
    <Radio.Group value={type} onChange={(e) => onChange(e.target.value)}>
      <Radio value="any">
        <span className="text-[13px]">
          匹配下列<b>任何</b>条件
        </span>
      </Radio>
      <Radio value="all">
        <span className="text-[13px]">
          匹配下列<b>所有</b>条件
        </span>
      </Radio>
    </Radio.Group>
  );
}

function TypeSwitch({ type, onChange }: TypeRadioGroupProps) {
  return (
    <div className={`${style.beforeLine} ${style.afterLine} flex flex-col items-center`}>
      <div className="relative border rounded-full p-0.5">
        <button className="w-14 h-8" type="button" onClick={() => onChange('all')}>
          且
        </button>
        <button className="w-14 h-8" type="button" onClick={() => onChange('any')}>
          或
        </button>
        <div
          className={cx(
            'absolute left-[2px] top-[2px] w-16 h-8 border border-primary rounded-full bg-white',
            'font-bold transition-transform duration-300 flex justify-center items-center',
            {
              'translate-x-12': type === 'any',
            }
          )}
        >
          {type === 'all' ? '且' : '或'}
        </div>
      </div>
    </div>
  );
}

function AddButton({ className, children, ...props }: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      {...props}
      className={cx('hover:bg-gray-100 p-2 flex items-center transition-colors rounded', className)}
    >
      <RiAddCircleFill className="text-primary inline-block w-5 h-5 mr-2" />
      {children}
    </button>
  );
}

export interface FieldGroupProps {
  config: Config;
  path: string;
  removeable?: boolean;
  onRemove?: () => void;
  typeSelectPlaceholder?: string;
}

export function FieldGroup({
  config,
  path,
  removeable,
  onRemove,
  typeSelectPlaceholder,
}: FieldGroupProps) {
  return (
    <div className={`${style.fieldGroup} relative flex flex-wrap gap-3 pl-5 pr-16 py-4`}>
      <TypeSelect config={config} path={path} placeholder={typeSelectPlaceholder} />
      <CustomField config={config} path={path} />

      {removeable && (
        <button
          className={`${style.deleteButton} absolute top-4.5 right-5 w-7 h-7 rounded-full hover:bg-red-500 hover:text-white`}
          onClick={onRemove}
        >
          <BiTrash className="m-auto w-[18px] h-[18px]" />
        </button>
      )}
    </div>
  );
}

export interface Config {
  [key: string]: {
    label?: string;
    component?: JSXElementConstructor<{ path: string }>;
  };
}

interface TypeSelectProps {
  config: Config;
  path: string;
  placeholder?: string;
  width?: number;
}

function TypeSelect({ config, path, placeholder, width = 180 }: TypeSelectProps) {
  const { control, formState, setValue } = useFormContext();

  const options = useMemo(() => {
    return Object.entries(config).map(([key, { label }]) => ({
      label: label ?? key,
      value: key,
    }));
  }, [config]);

  const error = get(formState.errors, `${path}.type`);

  return (
    <Form.Item validateStatus={error ? 'error' : undefined}>
      <Controller
        control={control}
        name={`${path}.type`}
        rules={{ required: true }}
        render={({ field }) => (
          <Select
            {...field}
            onChange={(type) => setValue(path, { type })}
            options={options}
            placeholder={placeholder}
            style={{ width }}
          />
        )}
      />
    </Form.Item>
  );
}

interface CustomFieldProps {
  config: Config;
  path: string;
}

function CustomField({ config, path }: CustomFieldProps) {
  const { control } = useFormContext();
  const type = useWatch({
    control,
    name: `${path}.type`,
  });

  if (type && type in config) {
    const { component } = config[type];
    if (component) {
      return createElement(component, { key: type, path });
    }
  }

  return null;
}

function Divider({ type }: { type: RootConditionType }) {
  return (
    <div className="flex items-center h-3">
      <div className="w-full flex justify-center items-center h-px border-[#cfd7df] border-t">
        <div className="bg-white px-5 py-0.5 border rounded-full text-sm">
          {type === 'all' ? '且' : '或'}
        </div>
      </div>
    </div>
  );
}

export interface ConditionFieldsProps {
  path: string;
  config: Config;
  min?: number;
  onEmpty?: () => void;
}

export function ConditionFields({ path, config, min = 0, onEmpty }: ConditionFieldsProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${path}.conditions`,
  });
  const type = useWatch({
    control,
    name: `${path}.type`,
  });

  const handleRemove = (index: number) => {
    remove(index);
    if (fields.length === 1) {
      onEmpty?.();
    }
  };

  const removeable = fields.length > min;

  return (
    <div className="border border-[#ebeff3] rounded shadow-sm">
      <div className="px-6 py-3 border-[#dadfe3] border-b">
        <Controller
          control={control}
          name={`${path}.type`}
          render={({ field }) => <TypeRadioGroup type={field.value} onChange={field.onChange} />}
        />
      </div>

      <div className="bg-[#f5f7f9]">
        {fields.map(({ id }, i) => (
          <Fragment key={id}>
            {i > 0 && <Divider type={type} />}
            <FieldGroup
              path={`${path}.conditions.${i}`}
              config={config}
              typeSelectPlaceholder="选择条件"
              removeable={removeable}
              onRemove={() => handleRemove(i)}
            />
          </Fragment>
        ))}
      </div>

      <div className="px-4 py-1 border-[#dadfe3] border-t">
        <AddButton type="button" onClick={() => append({})}>
          添加新的条件
        </AddButton>
      </div>
    </div>
  );
}

export interface ConditionsFieldProps {
  name: string;
  config: Config;
}

export function ConditionsField({ name, config }: ConditionsFieldProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${name}.conditions`,
  });

  return (
    <>
      {fields.map(({ id }, i) => (
        <Fragment key={id}>
          {i > 0 && (
            <Controller
              control={control}
              name={`${name}.type`}
              defaultValue="any"
              render={({ field }) => <TypeSwitch type={field.value} onChange={field.onChange} />}
            />
          )}
          <ConditionFields
            path={`${name}.conditions.${i}`}
            config={config}
            min={fields.length > 1 ? 0 : 1}
            onEmpty={() => remove(i)}
          />
        </Fragment>
      ))}
      {fields.length < 2 && (
        <div className={`flex flex-col items-center ${style.beforeLine}`}>
          <AddButton
            className="border rounded-full"
            type="button"
            onClick={() => append({ type: 'any', conditions: [{}] })}
          >
            添加新的过滤条件
          </AddButton>
        </div>
      )}
    </>
  );
}

export interface ActionFieldsProps {
  config: Config;
  name: string;
}

export function ActionFields({ config, name }: ActionFieldsProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  const removeable = fields.length > 1;
  return (
    <div className="border border-[#ebeff3] rounded shadow-sm">
      <div className="bg-[#f5f7f9]">
        {fields.map(({ id }, i) => (
          <Fragment key={id}>
            {i > 0 && <div className="h-px border-[#cfd7df] border-t" />}
            <FieldGroup
              path={`${name}.${i}`}
              config={config}
              typeSelectPlaceholder="选择操作"
              removeable={removeable}
              onRemove={() => remove(i)}
            />
          </Fragment>
        ))}
      </div>

      <div className="px-4 py-1 border-[#dadfe3] border-t">
        <AddButton type="button" onClick={() => append({})}>
          添加操作
        </AddButton>
      </div>
    </div>
  );
}
