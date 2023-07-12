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
import { AiOutlinePlus } from 'react-icons/ai';
import { BsXCircle } from 'react-icons/bs';
import cx from 'classnames';
import { omit } from 'lodash-es';

import { LOCALES } from '@/i18n/locales';
import { TicketFieldSchema } from '@/api/ticket-field';
import {
  Button,
  Checkbox,
  Col,
  Form,
  FormInstance,
  Input,
  InputNumber,
  Radio,
  Row,
  Tabs,
} from '@/components/antd';
import { TicketFieldType } from './TicketFieldType';
import { TicketFieldIcon } from './TicketFieldIcon';
import style from './index.module.css';
import { LocaleModal } from '../../components/LocaleModal';
import { MetaField, MetaOption } from '../../components/MetaField';

const fieldTypes: TicketFieldSchema['type'][] = [
  'text',
  'multi-line',
  'dropdown',
  'multi-select',
  'radios',
  'file',
  'number',
  'date',
];
const optionsFieldTypes: TicketFieldSchema['type'][] = ['dropdown', 'multi-select', 'radios'];

interface FieldTypeProps {
  value?: TicketFieldSchema['type'];
  onChange: (value: TicketFieldSchema['type']) => void;
  readonly?: boolean;
}

function FieldType({ value, onChange, readonly }: FieldTypeProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {fieldTypes.map((type) => (
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
          <TicketFieldIcon className="inline-block w-8 h-8" type={type} />
          <TicketFieldType className="block" type={type} />
        </button>
      ))}
    </div>
  );
}

interface FieldOptions {
  name: `variants.${number}.options`;
}

function FieldOptions({ name }: FieldOptions) {
  const { control } = useFormContext<TicketFieldData>();
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

  const [showModal, setShowModal] = useState(false);

  const existLocales = useMemo(() => fields.map(({ locale }) => locale), [fields]);

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

  const [type, visible, defaultLocale] = useWatch({
    control,
    name: ['type', 'visible', 'defaultLocale'],
  });
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

              <Row gutter={[16, 0]}>
                <Col span={12}>
                  <Controller
                    name={`variants.${index}.titleForCustomerService`}
                    rules={{ required: '请填写此字段' }}
                    defaultValue=""
                    render={({ field, fieldState: { error } }) => (
                      <Form.Item
                        required
                        label="向客服显示的标题"
                        validateStatus={error ? 'error' : undefined}
                        help={error?.message}
                      >
                        <Input {...field} />
                      </Form.Item>
                    )}
                  />
                </Col>
                <Col span={12}>
                  <Controller
                    name={`variants.${index}.title`}
                    rules={{
                      required: {
                        value: visible,
                        message: '请填写此字段',
                      },
                    }}
                    defaultValue=""
                    render={({ field, fieldState: { error } }) => (
                      <Form.Item
                        required={visible}
                        label="向用户显示的标题"
                        validateStatus={error ? 'error' : undefined}
                        help={error?.message}
                      >
                        <Input {...field} disabled={!visible} />
                      </Form.Item>
                    )}
                  />

                  <Controller
                    name={`variants.${index}.description`}
                    defaultValue=""
                    render={({ field }) => (
                      <Form.Item label="向用户展示的描述">
                        <Input.TextArea {...field} disabled={!visible} />
                      </Form.Item>
                    )}
                  />
                </Col>
              </Row>

              {hasOptions && (
                <>
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
        hiddenLocales={existLocales}
        onOk={(locale) => {
          append({
            locale,
            title: '',
            titleForCustomerService: '',
            description: '',
          });
          onChangeActiveLocale(locale);
          setShowModal(false);
        }}
        onCancel={() => setShowModal(false)}
      />
    </>
  );
}

interface TicketFieldData {
  title: string;
  type: TicketFieldSchema['type'];
  visible: boolean;
  required: boolean;
  defaultLocale: string;
  meta?: Record<string, any>;
  pattern?: string;
  variants: {
    locale: string;
    title: string;
    titleForCustomerService: string;
    description: string;
    options?: { title: string; value: string }[];
  }[];
}

const MetaExtraOptions: MetaOption[] = [
  {
    key: 'disableFilter',
    type: 'boolean',
    label: '关闭敏感词过滤',
  },
  {
    key: 'hideFromSelect',
    type: 'boolean',
    label: '在筛选器内隐藏此字段',
  },
  {
    key: 'priority',
    type: 'number',
    label: '优先度',
  },
];

export interface TicketFieldFormProps {
  initData?: Partial<TicketFieldData>;
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
  const { control, handleSubmit, getValues, setValue } = methods;
  const type = useWatch({ control, name: 'type' });

  const _handleSubmit = (data: TicketFieldData) => {
    const hasOptions = optionsFieldTypes.includes(data.type);
    if (!hasOptions) {
      data = {
        ...data,
        variants: data.variants.map((v) => omit(v, 'options')),
      };
    }
    if (!data.visible) {
      data = {
        ...data,
        variants: data.variants.map((v) => ({ ...v, title: v.titleForCustomerService })),
      };
    }
    onSubmit(data);
  };

  const handleSubmitError = (errors: FieldErrors<TicketFieldData>) => {
    if (errors.variants?.length) {
      const index = errors.variants!.findIndex!((v) => v !== undefined);
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
              name="title"
              rules={{ required: '请填写此字段' }}
              defaultValue=""
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

            <Form.Item label="权限" required>
              <Controller
                name="visible"
                defaultValue={false}
                render={({ field: { value, onChange } }) => (
                  <Radio.Group value={value} onChange={onChange}>
                    <Radio value={false}>仅限客服</Radio>
                    <Radio value={true}>用户可编辑</Radio>
                  </Radio.Group>
                )}
              />
            </Form.Item>

            {type === 'text' && (
              <Controller
                name="pattern"
                render={({ field }) => (
                  <Form.Item label="正则表达式">
                    <Input {...field} />
                  </Form.Item>
                )}
              />
            )}

            <Form.Item>
              <Controller
                name="required"
                defaultValue={false}
                render={({ field: { value, onChange } }) => (
                  <Checkbox checked={value} onChange={onChange} children="提交工单时必填" />
                )}
              />
            </Form.Item>

            <hr className="my-4" />
            <Controller
              name="type"
              render={({ field: { value, onChange } }) => (
                <Form.Item label="字段类型">
                  <FieldType
                    value={value}
                    onChange={(type) => {
                      onChange(type);
                      setValue('pattern', undefined);
                    }}
                    readonly={disableType}
                  />
                </Form.Item>
              )}
            />

            {type && (
              <>
                <Form.Item label="语言管理">
                  <FieldVariants
                    activeLocale={activeLocale}
                    onChangeActiveLocale={setActiveLocale}
                  />
                </Form.Item>
              </>
            )}
            <hr className="my-4" />

            <Controller
              name="meta"
              render={({ field: { value, onChange } }) => (
                <MetaField value={value} onChange={onChange} options={MetaExtraOptions} />
              )}
            />
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
