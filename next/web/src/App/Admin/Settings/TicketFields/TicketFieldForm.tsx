import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Controller,
  FieldErrors,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { IconType } from 'react-icons';
import { AiOutlinePlus } from 'react-icons/ai';
import {
  BsUiChecksGrid,
  BsCaretDownSquare,
  BsFileEarmarkArrowUp,
  BsInputCursorText,
  BsUiRadiosGrid,
  BsTextareaResize,
  BsXCircle,
} from 'react-icons/bs';
import cx from 'classnames';
import { omit } from 'lodash-es';

import { TicketFieldSchema } from '@/api/ticket-field';
import {
  Button,
  Checkbox,
  Form,
  FormInstance,
  Input,
  Modal,
  Select,
  Tabs,
} from '@/components/antd';
import { TicketFieldType } from './TicketFieldType';
import style from './index.module.css';

const fieldTypes: { type: TicketFieldSchema['type']; icon: IconType }[] = [
  {
    type: 'text',
    icon: BsInputCursorText,
  },
  {
    type: 'multi-line',
    icon: BsTextareaResize,
  },
  {
    type: 'dropdown',
    icon: BsCaretDownSquare,
  },
  {
    type: 'multi-select',
    icon: BsUiChecksGrid,
  },
  {
    type: 'radios',
    icon: BsUiRadiosGrid,
  },
  {
    type: 'file',
    icon: BsFileEarmarkArrowUp,
  },
];

const optionsFieldTypes: TicketFieldSchema['type'][] = ['dropdown', 'multi-select', 'radios'];

interface FieldTypeRadioGroupProps {
  value?: TicketFieldSchema['type'];
  onChange: (value: TicketFieldSchema['type']) => void;
  readonly?: boolean;
}

function FieldTypeRadioGroup({ value, onChange, readonly }: FieldTypeRadioGroupProps) {
  return (
    <div className="flex gap-2">
      {fieldTypes.map(({ type, icon: Icon }) => (
        <button
          key={type}
          className={cx(style.typeButton, {
            [style.readonly]: readonly,
            [style.active]: type === value,
          })}
          type="button"
          disabled={readonly}
          onClick={() => onChange(type)}
        >
          <Icon className="inline-block w-8 h-8" />
          <TicketFieldType className="block" type={type} />
        </button>
      ))}
    </div>
  );
}

const LOCALES: Record<string, string> = {
  'zh-cn': '简体中文',
  'zh-tw': '繁体中文（台湾）',
  'zh-hk': '繁体中文（香港）',
  en: '英文',
  ja: '日文',
  ko: '韩文',
  id: '印尼文',
  th: '泰文',
  de: '德文',
  fr: '法文',
  ru: '俄文',
  es: '西班牙文',
  pt: '葡萄牙文',
  tr: '土耳其文',
};

interface LocaleModalProps {
  show: boolean;
  options: { label: string; value: string }[];
  onOk: (locale: string) => void;
  onCancel: () => void;
}

function LocaleModal({ show, options, onOk, onCancel }: LocaleModalProps) {
  const [value, setValue] = useState<string>();
  useEffect(() => {
    setValue(undefined);
  }, [show]);

  return (
    <Modal
      title="请选择要添加的语言"
      visible={show}
      okButtonProps={{ disabled: !value }}
      onOk={() => onOk(value!)}
      onCancel={onCancel}
    >
      <Select className="w-full" options={options} value={value} onChange={setValue} />
    </Modal>
  );
}

interface FieldOptions {
  name: `variants.${number}.options`;
}

function FieldOptions({ name }: FieldOptions) {
  const { control, getValues, setError, clearErrors } = useFormContext<TicketFieldData>();
  const { fields, append, remove } = useFieldArray({ control, name });
  const options = useWatch({ control, name });
  const titleCount = useMemo(() => {
    const map = new Map<string, number>();
    options?.forEach(({ title }) => {
      const count = map.get(title);
      if (count) {
        map.set(title, count + 1);
      } else {
        map.set(title, 1);
      }
    });
    return map;
  }, [options]);

  useEffect(() => {
    if (fields.length === 0) {
      append({ title: '', value: '' }, { shouldFocus: false });
    }
  }, []);

  const deleteable = fields.length > 1;

  return (
    <>
      {fields.map(({ id }, i) => (
        <div key={id} className={cx('flex gap-2 mb-2', { 'mr-7': !deleteable })}>
          <Controller
            control={control}
            name={`${name}.${i}.value`}
            rules={{ required: '请填写此字段' }}
            render={({ field, fieldState: { error } }) => (
              <Form.Item
                className="grow"
                style={{ marginBottom: 0 }}
                validateStatus={error ? 'error' : undefined}
                help={error?.message}
              >
                <Input {...field} placeholder="值" />
              </Form.Item>
            )}
          />
          <Controller
            control={control}
            name={`${name}.${i}.title`}
            rules={{
              required: '请填写此字段',
              validate: (title) => {
                const count = titleCount.get(title);
                if (count && count > 1) {
                  return '字段标签必须唯一';
                }
                return true;
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <Form.Item
                className="grow"
                style={{ marginBottom: 0 }}
                validateStatus={error ? 'error' : undefined}
                help={error?.message}
              >
                <Input {...field} placeholder="标签" />
              </Form.Item>
            )}
          />
          {deleteable && (
            <button className="w-5 h-5 mt-2 text-red-400" type="button" onClick={() => remove(i)}>
              <BsXCircle className="w-full h-full" />
            </button>
          )}
        </div>
      ))}
      <Button
        size="small"
        icon={<AiOutlinePlus className="m-auto" />}
        onClick={() => append({ title: '', value: '' })}
      />
    </>
  );
}

interface FieldVariantsProps {
  activeLocale?: string;
  onChangeActiveLocale: (locale: string) => void;
}

function FieldVariants({ activeLocale, onChangeActiveLocale }: FieldVariantsProps) {
  const { control, setValue } = useFormContext<TicketFieldData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const defaultLocale = useWatch({ control, name: 'defaultLocale' });

  const [showModal, setShowModal] = useState(false);

  const localeOptions = useMemo(() => {
    return Object.entries(LOCALES)
      .filter(([locale]) => !fields.some((f) => f.locale === locale))
      .map(([value, label]) => ({ value, label }));
  }, [fields]);

  const handleEditTabs = (key: any, action: 'add' | 'remove') => {
    if (action === 'add') {
      setShowModal(true);
      return;
    } else {
      const i = fields.findIndex((f) => f.locale === key);
      if (i >= 0) {
        if (activeLocale === key) {
          onChangeActiveLocale(i > 0 ? fields[i - 1].locale : fields[i + 1].locale);
        }
        remove(i);
      }
    }
  };

  const type = useWatch({ control, name: 'type' });
  const hasOptions = useMemo(() => type && optionsFieldTypes.includes(type), [type]);

  return (
    <>
      <Tabs
        type="editable-card"
        activeKey={activeLocale}
        onChange={onChangeActiveLocale}
        onEdit={handleEditTabs}
      >
        {fields.map(({ locale }, index) => {
          const isDefault = locale === defaultLocale;
          return (
            <Tabs.TabPane
              key={locale}
              className="p-2"
              tab={`${LOCALES[locale]} ${isDefault ? '(默认)' : ''}`}
              closable={!isDefault}
            >
              <div className="mb-4">
                <Button disabled={isDefault} onClick={() => setValue('defaultLocale', locale)}>
                  设为默认
                </Button>
              </div>

              <Controller
                control={control}
                name={`variants.${index}.title`}
                rules={{ required: '请填写此字段' }}
                render={({ field, fieldState: { error } }) => (
                  <Form.Item
                    required
                    label="向用户展示的标题"
                    validateStatus={error ? 'error' : undefined}
                    help={error?.message}
                  >
                    <Input {...field} />
                  </Form.Item>
                )}
              />

              <Controller
                control={control}
                name={`variants.${index}.description`}
                render={({ field }) => (
                  <Form.Item label="向用户展示的描述">
                    <Input.TextArea {...field} />
                  </Form.Item>
                )}
              />

              {hasOptions && (
                <>
                  <hr className="my-4" />
                  <Form.Item label="字段值">
                    <FieldOptions name={`variants.${index}.options`} />
                  </Form.Item>
                </>
              )}
            </Tabs.TabPane>
          );
        })}
      </Tabs>

      <LocaleModal
        show={showModal}
        options={localeOptions}
        onOk={(locale) => {
          append({ locale });
          onChangeActiveLocale(locale);
          setShowModal(false);
        }}
        onCancel={() => setShowModal(false)}
      />
    </>
  );
}

interface TicketFieldData {
  title?: string;
  type?: TicketFieldSchema['type'];
  required?: boolean;
  defaultLocale?: string;
  variants?: {
    locale: string;
    title?: string;
    description?: string;
    options?: { title: string; value: string }[];
  }[];
}

export interface TicketFieldFormProps {
  initData?: TicketFieldData;
  submitting?: boolean;
  onSubmit: (data: TicketFieldData) => void;
  onCancel: () => void;
  disableType?: boolean;
}

export function TicketFieldForm({
  initData,
  submitting,
  onSubmit,
  onCancel,
  disableType,
}: TicketFieldFormProps) {
  const [activeLocale, setActiveLocale] = useState<string>();
  const methods = useForm<TicketFieldData>({ defaultValues: initData });
  const { control, handleSubmit, getValues } = methods;
  const type = useWatch({ control, name: 'type' });

  const _handleSubmit = (data: TicketFieldData) => {
    const hasOptions = optionsFieldTypes.includes(data.type!);
    if (!hasOptions) {
      onSubmit({
        ...data,
        variants: data.variants!.map((variants) => omit(variants, 'options')),
      });
    } else {
      onSubmit(data);
    }
  };

  const handleSubmitError = (errors: FieldErrors<TicketFieldData>) => {
    if (errors.variants?.length) {
      const index = errors.variants.findIndex((v) => v !== undefined);
      setActiveLocale(getValues('variants')![index].locale);
    }
  };

  const $form = useRef<FormInstance>(null!);

  return (
    <div className="h-full flex flex-col">
      <div className="grow overflow-y-auto px-10 pt-10">
        <FormProvider {...methods}>
          <Form
            ref={$form}
            className={style.fieldForm}
            layout="vertical"
            onFinish={handleSubmit(_handleSubmit, handleSubmitError)}
          >
            <Controller
              control={control}
              name="title"
              rules={{ required: '请填写此字段' }}
              render={({ field, fieldState: { error } }) => (
                <Form.Item
                  required
                  label="字段名称"
                  validateStatus={error ? 'error' : undefined}
                  help={error?.message}
                >
                  <Input {...field} autoFocus />
                </Form.Item>
              )}
            />

            <Controller
              control={control}
              name="type"
              render={({ field: { value, onChange } }) => (
                <Form.Item label="字段类型">
                  <FieldTypeRadioGroup value={value} onChange={onChange} readonly={disableType} />
                </Form.Item>
              )}
            />

            {type && (
              <>
                <hr className="my-4" />
                <Form.Item>
                  <Controller
                    control={control}
                    name="required"
                    render={({ field: { value, onChange } }) => (
                      <Checkbox checked={value} onChange={onChange} children="必填" />
                    )}
                  />
                </Form.Item>

                <Form.Item label="语言管理">
                  <FieldVariants
                    activeLocale={activeLocale}
                    onChangeActiveLocale={setActiveLocale}
                  />
                </Form.Item>
              </>
            )}
          </Form>
        </FormProvider>
      </div>

      <div className="flex flex-row-reverse px-10 py-4 border-t border-[#D8DCDE]">
        <Button
          type="primary"
          disabled={!type}
          loading={submitting}
          onClick={() => $form.current.submit()}
        >
          保存
        </Button>
        <Button className="mr-4" type="link" disabled={submitting} onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
}
