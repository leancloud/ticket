import { ComponentPropsWithoutRef, Fragment } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { BiTrash } from 'react-icons/bi';
import { RiAddCircleFill } from 'react-icons/ri';
import cx from 'classnames';

import { Radio } from '@/components/antd';
import { Config, CustomField } from './CustomField';
import style from './index.module.css';

type ConditionsType = 'all' | 'any';

interface ConditionsTypeRadioGroupProps {
  type: ConditionsType;
  onChange: (type: ConditionsType) => void;
}

function ConditionsTypeRadioGroup({ type, onChange }: ConditionsTypeRadioGroupProps) {
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

function ConditionsTypeSwitch({ type, onChange }: ConditionsTypeRadioGroupProps) {
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
            'font-bold duration-300 flex justify-center items-center',
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

function Divider({ type }: { type: ConditionsType }) {
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

export interface FieldProps {
  config: Config;
  path: string;
  removeable?: boolean;
  onRemove?: () => void;
  typeSelectPlaceholder?: string;
  typeSelectWidth?: number;
}

export function Field({
  config,
  path,
  removeable,
  onRemove,
  typeSelectPlaceholder,
  typeSelectWidth,
}: FieldProps) {
  return (
    <div className={`${style.fieldGroup} relative flex flex-wrap gap-3 pl-5 pr-16 py-4`}>
      <CustomField
        config={config}
        path={path}
        typeSelectPlaceholder={typeSelectPlaceholder}
        typeSelectWidth={typeSelectWidth}
      />
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

export function AddButton({ className, children, ...props }: ComponentPropsWithoutRef<'button'>) {
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

export interface ConditionsProps {
  config: Config;
  name: string;
  min?: number;
  onEmpty?: () => void;
  typeSelectWidth?: number;
}

export function Conditions({ config, name, min = 0, onEmpty, typeSelectWidth }: ConditionsProps) {
  const { control } = useFormContext();
  const type = useWatch({ control, name: `${name}.type` });
  const { fields, append, remove } = useFieldArray({ control, name: `${name}.conditions` });

  const removeable = fields.length > min;
  const handleRemove = (index: number) => {
    remove(index);
    if (fields.length === 1) {
      onEmpty?.();
    }
  };

  return (
    <div className="border border-[#ebeff3] rounded shadow-sm">
      <div className="px-6 py-3 border-[#dadfe3] border-b">
        <Controller
          control={control}
          name={`${name}.type`}
          render={({ field }) => (
            <ConditionsTypeRadioGroup type={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <div className="bg-[#f5f7f9]">
        {fields.map(({ id }, i) => (
          <Fragment key={id}>
            {i > 0 && <Divider type={type} />}
            <Field
              config={config}
              path={`${name}.conditions.${i}`}
              removeable={removeable}
              onRemove={() => handleRemove(i)}
              typeSelectPlaceholder="选择条件"
              typeSelectWidth={typeSelectWidth}
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

export interface ConditionsGroupProps {
  config: Config;
  name: string;
  typeSelectWidth?: number;
}

export function ConditionsGroup({ config, name, typeSelectWidth }: ConditionsGroupProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: `${name}.conditions` });

  return (
    <>
      {fields.map(({ id }, i) => (
        <Fragment key={id}>
          {i > 0 && (
            <Controller
              control={control}
              name={`${name}.type`}
              defaultValue="any"
              render={({ field }) => (
                <ConditionsTypeSwitch type={field.value} onChange={field.onChange} />
              )}
            />
          )}
          <Conditions
            config={config}
            name={`${name}.conditions.${i}`}
            min={fields.length > 1 ? 0 : 1}
            onEmpty={() => remove(i)}
            typeSelectWidth={typeSelectWidth}
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
