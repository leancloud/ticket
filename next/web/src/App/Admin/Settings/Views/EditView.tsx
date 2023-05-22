import { ComponentPropsWithoutRef, forwardRef, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useController, useForm, useWatch } from 'react-hook-form';
import { BsX } from 'react-icons/bs';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Link } from 'react-router-dom';
import cx from 'classnames';

import { useCurrentUser } from '@/leancloud';
import { Button, Form, FormInstance, Input, Radio, Select } from '@/components/antd';
import { GroupSelect } from '@/components/common';
import DragIcon from '@/icons/DragIcon';
import { conditions } from './conditions';
import { ConditionsGroup } from '../Automations/components/TriggerForm/Conditions';

const { Option } = Select;

function ViewPrivilege() {
  const { field: userIdsField } = useController<ViewData>({ name: 'userIds' });

  const {
    field: groupIdsField,
    fieldState: { error: groupIdsError },
  } = useController<ViewData>({
    name: 'groupIds',
    rules: {
      validate: (ids?: string[]) => {
        if (ids && ids.length === 0) {
          return '请填写此字段';
        }
        return true;
      },
    },
  });

  const [userIds, groupIds] = useWatch<ViewData>({ name: ['userIds', 'groupIds'] });

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
      userIdsField.onChange(null);
      groupIdsField.onChange(null);
    } else if (visibility === 'group') {
      userIdsField.onChange(null);
      groupIdsField.onChange([]);
    } else if (visibility === 'user') {
      userIdsField.onChange([currentUser!.id]);
      groupIdsField.onChange(null);
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
  { label: '工单语言', value: 'language' },
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

const DEFAULT_VALUES: Partial<ViewData> = {
  conditions: {
    type: 'any',
    conditions: [{ type: 'any', conditions: [{}] }],
  },
};

export interface ViewData {
  title: string;
  userIds?: string[] | null;
  groupIds?: string[] | null;
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

export function EditView({ initData = DEFAULT_VALUES, submitting, onSubmit }: EditViewProps) {
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
            <ConditionsGroup config={conditions} name="conditions" />
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
        <Button type="primary" loading={submitting} onClick={() => $antForm.current.submit()}>
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
