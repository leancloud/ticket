import { ComponentPropsWithoutRef, forwardRef, useMemo, useRef, useState } from 'react';
import {
  Controller,
  FormProvider,
  useController,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { BsX } from 'react-icons/bs';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Link } from 'react-router-dom';
import cx from 'classnames';
import { pick } from 'lodash-es';

import { useCurrentUser } from '@/leancloud';
import { Button, Form, FormInstance, Input, Radio, Select } from '@/components/antd';
import { GroupSelect } from '@/components/common';
import DragIcon from '@/icons/DragIcon';
import { conditions } from './conditions';
import style from './index.module.css';

const { Option } = Select;

function ViewPrivilege() {
  const { control } = useFormContext<ViewData>();

  const { field: userIdsField } = useController({ control, name: 'userIds' });
  const {
    field: groupIdsField,
    fieldState: { error: groupIdsError },
  } = useController({
    control,
    name: 'groupIds',
    rules: {
      validate: (ids?: string[]) => {
        if (visibility === 'group' && (!ids || ids.length === 0)) {
          return '请填写此字段';
        }
        return true;
      },
    },
  });

  const userIds = userIdsField.value;
  const groupIds = groupIdsField.value;

  const visibility = useMemo(() => {
    if (userIds) {
      return 'user';
    } else if (groupIds) {
      return 'group';
    }
    return 'all';
  }, [userIds, groupIds]);

  const currentUser = useCurrentUser();

  const handleChangeVisibility = (visibility: string) => {
    if (visibility === 'all') {
      userIdsField.onChange(undefined);
      groupIdsField.onChange(undefined);
    } else if (visibility === 'group') {
      userIdsField.onChange(undefined);
      groupIdsField.onChange([]);
    } else if (visibility === 'user') {
      userIdsField.onChange([currentUser!.id]);
      groupIdsField.onChange(undefined);
    }
  };

  return (
    <div className="flex gap-4">
      <Form.Item label="谁可访问">
        <Select value={visibility} onChange={handleChangeVisibility} style={{ width: 200 }}>
          <Option value="all">任意客服</Option>
          <Option value="group">指定组中的客服</Option>
          <Option value="user">仅限您</Option>
        </Select>
      </Form.Item>
      {visibility === 'group' && (
        <Form.Item
          className="grow"
          label="选择哪些组可访问"
          validateStatus={groupIdsError ? 'error' : undefined}
          help={groupIdsError?.message}
        >
          <GroupSelect {...groupIdsField} mode="multiple" />
        </Form.Item>
      )}
    </div>
  );
}

const typeOptions = conditions.map((c) => pick(c, ['label', 'value']));

interface ConditionProps {
  name: string;
  deleteable?: boolean;
  onDelete: () => void;
}

function Condition({ name, deleteable, onDelete }: ConditionProps) {
  const { control, setValue } = useFormContext();
  const [type, op] = useWatch({ control, name: [`${name}.type`, `${name}.op`] });

  const ops = useMemo(() => {
    if (type) {
      return conditions.find((c) => c.value === type)?.ops;
    }
  }, [type]);

  const opOptions = useMemo(() => {
    return ops?.map((o) => pick(o, ['label', 'value']));
  }, [ops]);

  const ValueComponent = useMemo(() => {
    if (ops && op) {
      return ops.find((t) => t.value === op)?.component;
    }
  }, [ops, op]);

  return (
    <div
      className={cx('flex mb-4', {
        'pr-8': !deleteable,
      })}
    >
      <div className={cx(style.conditionGroup, 'grow grid grid-cols-3 gap-2')}>
        <Controller
          name={`${name}.type`}
          rules={{ required: '请填写此字段' }}
          render={({ field, fieldState: { error } }) => (
            <Form.Item validateStatus={error ? 'error' : undefined} help={error?.message}>
              <Select
                {...field}
                placeholder="请选择字段"
                options={typeOptions}
                onChange={(type) => {
                  field.onChange(type);
                  setValue(`${name}.op`, undefined);
                  setValue(`${name}.value`, undefined);
                }}
              />
            </Form.Item>
          )}
        />
        {type && (
          <Controller
            name={`${name}.op`}
            rules={{ required: '请填写此字段' }}
            render={({ field, fieldState: { error } }) => (
              <Form.Item validateStatus={error ? 'error' : undefined} help={error?.message}>
                <Select
                  {...field}
                  options={opOptions}
                  onChange={(op) => {
                    field.onChange(op);
                    setValue(`${name}.value`, undefined);
                  }}
                />
              </Form.Item>
            )}
          />
        )}
        {ValueComponent && (
          <Controller
            key={`${type}.${op}`}
            name={`${name}.value`}
            rules={{ required: '请填写此字段' }}
            render={({ field, fieldState: { error } }) => (
              <Form.Item validateStatus={error ? 'error' : undefined} help={error?.message}>
                <ValueComponent {...field} />
              </Form.Item>
            )}
          />
        )}
      </div>
      {deleteable && (
        <button className="ml-2 mt-2 w-5 h-5" type="button" onClick={onDelete}>
          <BsX className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function Conditions({ name }: { name: string }) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div>
      {fields.map((field, index) => (
        <Condition
          key={field.id}
          name={`${name}.${index}`}
          deleteable
          onDelete={() => remove(index)}
        />
      ))}
      <Button type="primary" ghost onClick={() => append({})}>
        添加条件
      </Button>
    </div>
  );
}

interface ColumnProps extends ComponentPropsWithoutRef<'div'> {
  deleteable: boolean;
  onDelete: () => void;
  dragIconProps?: ComponentPropsWithoutRef<'div'>;
}

const Column = forwardRef<HTMLDivElement, ColumnProps>(
  ({ children, deleteable, onDelete, dragIconProps, ...props }, ref) => {
    return (
      <div
        {...props}
        ref={ref}
        className={cx(
          'flex items-center w-[385px] mb-2 p-[10px] border border-[#d8dcde] rounded leading-[20px]',
          props.className
        )}
      >
        <div {...dragIconProps}>
          <DragIcon className="w-4 h-4" />
        </div>
        <div className="grow ml-2">{children}</div>
        {deleteable && (
          <button type="button" onClick={onDelete}>
            <BsX className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }
);

const columns = [
  { label: '编号', value: 'nid' },
  { label: '标题', value: 'title' },
  { label: '创建人', value: 'author' },
  { label: '负责人', value: 'assignee' },
  { label: '客服组', value: 'group' },
  { label: '分类', value: 'category' },
  { label: '状态', value: 'status' },
  { label: '创建时间', value: 'createdAt' },
  { label: '更新时间', value: 'updatedAt' },
];

export const columnLabels = columns.reduce((map, col) => {
  map[col.value] = col.label;
  return map;
}, {} as Record<string, string>);

const sortableColumns = [
  { label: '状态', value: 'status' },
  { label: '创建时间', value: 'createdAt' },
  { label: '更新时间', value: 'updatedAt' },
];

interface ColumnsProps {
  value?: string[];
  onChange: (value: string[]) => void;
}

function Columns({ value, onChange }: ColumnsProps) {
  const [showSelect, setShowSelect] = useState(false);
  const options = useMemo(() => {
    if (value) {
      return columns.filter((c) => !value.includes(c.value));
    }
    return columns;
  }, [value]);

  const remove = (index: number) => {
    onChange(value!.slice(0, index).concat(value!.slice(index + 1)));
  };

  const handleDrag = ({ source, destination }: DropResult) => {
    if (destination && source.index !== destination.index) {
      const newValue = value!.slice();
      newValue.splice(destination.index, 0, newValue.splice(source.index, 1)[0]);
      onChange(newValue);
    }
  };

  return (
    <div>
      <DragDropContext onDragEnd={handleDrag}>
        <Droppable droppableId="viewColumns">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="inline-block">
              {value?.map((field, index) => (
                <Draggable key={field} draggableId={field} index={index}>
                  {(provided) => (
                    <Column
                      {...provided.draggableProps}
                      ref={provided.innerRef}
                      className="bg-white"
                      dragIconProps={provided.dragHandleProps}
                      deleteable={value?.length > 1}
                      onDelete={() => remove(index)}
                    >
                      {columnLabels[field]}
                    </Column>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="mt-2">
        {showSelect && (
          <div className="mb-2">
            <Select
              open
              autoFocus
              options={options}
              onSelect={(field: string) => {
                onChange(value ? [...value, field] : [field]);
                setShowSelect(false);
              }}
              onBlur={() => setShowSelect(false)}
            />
          </div>
        )}

        <Button
          type="primary"
          ghost
          disabled={options.length === 0}
          onClick={() => setShowSelect(true)}
        >
          添加列
        </Button>
      </div>
    </div>
  );
}

export interface ViewData {
  title: string;
  userIds?: string[];
  groupIds?: string[];
  conditions: any;
  fields: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EditViewProps {
  initData?: Partial<ViewData>;
  submitting?: boolean;
  onSubmit: (data: ViewData) => void;
}

export function EditView({ initData, submitting, onSubmit }: EditViewProps) {
  const methods = useForm<ViewData>({ defaultValues: initData });
  const { handleSubmit } = methods;

  const $antForm = useRef<FormInstance>(null!);

  return (
    <div>
      <FormProvider {...methods}>
        <Form ref={$antForm} layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <Controller
            name="title"
            defaultValue=""
            rules={{ required: '请填写此字段' }}
            render={({ field, fieldState: { error } }) => (
              <Form.Item
                label="视图名称"
                validateStatus={error ? 'error' : undefined}
                help={error?.message}
              >
                <Input {...field} autoFocus />
              </Form.Item>
            )}
          />

          <ViewPrivilege />

          <Form.Item label="条件">
            <div className="mb-2 font-semibold">工单必须满足所有这些条件以在视图中显示</div>
            <Conditions name="conditions.all" />

            <div className="mt-4 mb-2 font-semibold">工单可以满足任意这些条件以在视图中显示</div>
            <Conditions name="conditions.any" />
          </Form.Item>

          <Controller
            name="fields"
            defaultValue={['title', 'author', 'assignee', 'createdAt']}
            render={({ field: { value, onChange } }) => (
              <Form.Item label="列">
                <Columns value={value} onChange={onChange} />
              </Form.Item>
            )}
          />

          <Form.Item label="排序依据">
            <div className="mb-3">
              <Controller
                name="sortBy"
                defaultValue="createdAt"
                render={({ field }) => (
                  <Select {...field} options={sortableColumns} style={{ width: 200 }} />
                )}
              />
            </div>
            <Controller
              name="sortOrder"
              defaultValue="desc"
              render={({ field: { value, onChange } }) => (
                <Radio.Group value={value} onChange={onChange}>
                  <div className="flex flex-col gap-1">
                    <Radio value="asc">正序</Radio>
                    <Radio value="desc">倒序</Radio>
                  </div>
                </Radio.Group>
              )}
            />
          </Form.Item>
        </Form>
      </FormProvider>

      <div className="flex flex-row-reverse">
        <Button type="primary" disabled={submitting} onClick={() => $antForm.current.submit()}>
          保存
        </Button>
        <Link to="..">
          <Button className="mr-2" disabled={submitting}>
            取消
          </Button>
        </Link>
      </div>
    </div>
  );
}
