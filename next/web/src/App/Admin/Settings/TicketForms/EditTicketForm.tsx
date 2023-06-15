import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { AiOutlinePlus, AiOutlineSearch, AiOutlineFileText } from 'react-icons/ai';
import { BsX } from 'react-icons/bs';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import cx from 'classnames';
import { keyBy } from 'lodash-es';

import { TicketFormItem } from '@/api/ticket-form';
import { TicketFieldSchema, useTicketFields } from '@/api/ticket-field';
import {
  TicketFormNoteSchema,
  useTicketFormNotes,
  useTicketFormNotesWithDetail,
} from '@/api/ticket-form-note';
import { Alert, Button, Form, FormInstance, Input, Modal, Tabs } from '@/components/antd';
import DragIcon from '@/icons/DragIcon';
import { FormItems } from '@/App/Tickets/New/TicketForm/FormItems';
import ticketFormStyle from '@/App/Tickets/New/TicketForm/index.module.css';
import { TicketFieldIcon } from '../TicketFields';
import { RefreshButton } from './components/RefreshButton';

const SYSTEM_FIELD_IDS = ['title', 'details', 'attachments'];

interface SelectedItemProps {
  index: number;
  id: string;
  active: boolean;
  onRemove: () => void;
}

function SelectedItem({
  index,
  id,
  active,
  onRemove,
  children,
}: PropsWithChildren<SelectedItemProps>) {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cx(
            'h-16 grid grid-cols-[32px_1fr_20px] bg-white border border-[#c2c8cc] rounded shadow select-none mb-2',
            {
              'bg-gray-100': !active,
            }
          )}
        >
          <div {...provided.dragHandleProps} className="w-8 h-full cursor-grab flex">
            <DragIcon className="w-4 h-4 m-auto" />
          </div>
          <div>{children}</div>
          <div>
            <button className="text-[#87929d]" type="button" onClick={onRemove}>
              <BsX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}

interface SelectedFieldItemProps {
  index: number;
  id: string;
  type: TicketFieldSchema['type'];
  title: string;
  active: boolean;
  visible: boolean;
  required: boolean;
  onRemove: () => void;
}

function SelectedFieldItem({
  index,
  id,
  type,
  title,
  active,
  visible,
  required,
  onRemove,
}: SelectedFieldItemProps) {
  return (
    <SelectedItem id={id} index={index} active={active} onRemove={onRemove}>
      <div className="h-full grid grid-cols-[32px_1fr]">
        {type && <TicketFieldIcon className="w-5 h-5 m-auto" type={type} />}
        <div className="pl-3 flex flex-col justify-center items-start overflow-hidden">
          <div
            className="text-[16px] leading-[16px] text-[#49545c] font-bold max-w-full truncate"
            title={title}
          >
            {title ?? id}
            {required && <span className="text-red-600"> *</span>}
          </div>
          {!active && <div className="text-sm text-[#87929d] leading-3 mt-1">未激活</div>}
          {SYSTEM_FIELD_IDS.includes(id) && (
            <div className="text-sm text-[#87929d] leading-3 mt-1">系统字段</div>
          )}
          {!visible && <div className="text-sm text-[#87929d] leading-3 mt-1">仅客服可见</div>}
        </div>
      </div>
    </SelectedItem>
  );
}

interface SelectedNoteItemProps {
  index: number;
  id: string;
  name: string;
  active: boolean;
  onRemove: () => void;
}

function SelectedNoteItem({ index, id, name, active, onRemove }: SelectedNoteItemProps) {
  return (
    <SelectedItem id={id} index={index} active={active} onRemove={onRemove}>
      <div className="h-full  grid grid-cols-[32px_1fr]">
        <AiOutlineFileText className="w-5 h-5 m-auto" />
        <div className="pl-3 h-full grow flex flex-col justify-center items-start overflow-hidden">
          <div
            className="text-[16px] leading-[16px] text-[#49545c] font-bold truncate max-w-full"
            title={name}
          >
            {name}
          </div>
        </div>
      </div>
    </SelectedItem>
  );
}

interface AvailableFieldItemProps {
  type: TicketFieldSchema['type'];
  title: string;
  onAdd: () => void;
}

function AvailableFieldItem({ type, title, onAdd }: AvailableFieldItemProps) {
  return (
    <div className="h-8 grid grid-cols-[32px_1fr_32px] border border-[#d8dcde] rounded cursor-default bg-white select-none">
      <TicketFieldIcon className="m-auto" type={type} />
      <div className="leading-8 text-sm grow truncate" title={title}>
        {title}
      </div>
      <button type="button" onClick={onAdd}>
        <AiOutlinePlus className="m-auto" />
      </button>
    </div>
  );
}

interface AvailableNoteItemProps {
  name: string;
  onAdd: () => void;
}

function AvailableNoteItem({ name, onAdd }: AvailableNoteItemProps) {
  return (
    <div className="h-8 grid grid-cols-[32px_1fr_32px] border border-[#d8dcde] rounded cursor-default bg-white select-none">
      <AiOutlineFileText className="m-auto" />
      <div className="leading-8 text-sm grow truncate" title={name}>
        {name}
      </div>
      <button type="button" onClick={onAdd}>
        <AiOutlinePlus className="m-auto" />
      </button>
    </div>
  );
}

interface FormItemsBuilderProps {
  fields: {
    data?: TicketFieldSchema[];
    loading?: boolean;
    onReload: () => void;
  };
  notes: {
    data?: TicketFormNoteSchema[];
    loading?: boolean;
    onReload: () => void;
  };
  value?: TicketFormData['items'];
  error?: string;
  onChange: (value: TicketFormData['items']) => void;
}

function FormItemsBuilder({ fields, notes, value, error, onChange }: FormItemsBuilderProps) {
  const [activeTab, setActiveTab] = useState('field');
  const [keyword, setKeyword] = useState('');

  const fieldById = useMemo(() => keyBy(fields.data, (field) => field.id), [fields.data]);
  const activeFields = useMemo(() => fields.data?.filter((f) => f.active), [fields.data]);
  const selectedFieldIdSet = useMemo(() => {
    if (value) {
      const ids = value.filter((v) => v.type === 'field').map((v) => v.id);
      return new Set(ids);
    }
  }, [value]);
  const availableFields = useMemo(() => {
    if (activeFields && selectedFieldIdSet) {
      return activeFields.filter((f) => !selectedFieldIdSet.has(f.id));
    }
    return activeFields;
  }, [activeFields, selectedFieldIdSet]);
  const filteredFields = useMemo(() => {
    if (activeTab === 'field' && availableFields) {
      return availableFields.filter((f) => f.title.includes(keyword));
    }
  }, [availableFields, keyword, activeTab]);

  const noteById = useMemo(() => keyBy(notes.data, (note) => note.id), [notes.data]);
  const activeNotes = useMemo(() => notes.data?.filter((n) => n.active), [notes.data]);
  const selectedNoteIdSet = useMemo(() => {
    if (value) {
      const ids = value.filter((v) => v.type === 'note').map((v) => v.id);
      return new Set(ids);
    }
  }, [value]);
  const availableNotes = useMemo(() => {
    if (activeNotes && selectedNoteIdSet) {
      return activeNotes.filter((note) => !selectedNoteIdSet.has(note.id));
    }
    return activeNotes;
  }, [activeNotes, selectedNoteIdSet]);
  const filteredNotes = useMemo(() => {
    if (activeTab === 'note' && availableNotes) {
      return availableNotes.filter((f) => f.name.includes(keyword));
    }
  }, [availableNotes, keyword, activeTab]);

  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (destination && source.index !== destination.index) {
      const newList = value!.slice();
      newList.splice(destination.index, 0, newList.splice(source.index, 1)[0]);
      onChange(newList);
    }
  };

  const handleAddItem = (item: TicketFormData['items'][number]) => {
    if (value) {
      onChange([...value, item]);
    } else {
      onChange([item]);
    }
  };

  const handleRemoveItem = (id: string) => {
    if (value) {
      onChange(value.filter((v) => v.id !== id));
    }
  };

  return (
    <div className="grid grid-cols-10 gap-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="selectFields">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="col-span-6 flex flex-col"
            >
              {error && (
                <Alert showIcon type="error" message={error} style={{ marginBottom: 16 }} />
              )}
              {value?.map(({ type, id }, index) => {
                if (type === 'field') {
                  const field = fieldById[id];
                  if (!field) {
                    return null;
                  }
                  return (
                    <SelectedFieldItem
                      {...field}
                      key={id}
                      index={index}
                      onRemove={() => handleRemoveItem(id)}
                    />
                  );
                } else if (type === 'note') {
                  const note = noteById[id];
                  if (!note) {
                    return null;
                  }
                  return (
                    <SelectedNoteItem
                      {...note}
                      key={note.id}
                      index={index}
                      onRemove={() => handleRemoveItem(id)}
                    />
                  );
                }
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="col-span-4 p-5 pt-2 border border-[#d8dcde] rounded bg-gray-50">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="可用字段" key="field">
            <div className="flex items-center gap-2">
              <Input
                size="small"
                prefix={<AiOutlineSearch className="w-4 h-4" />}
                placeholder="搜索"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <RefreshButton
                className="shrink-0"
                loading={fields.loading}
                onClick={fields.onReload}
              />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {filteredFields?.map(({ id, type, title }) => (
                <AvailableFieldItem
                  key={id}
                  type={type}
                  title={title}
                  onAdd={() => handleAddItem({ type: 'field', id })}
                />
              ))}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="可用说明" key="note">
            <div className="flex items-center gap-2">
              <Input
                size="small"
                prefix={<AiOutlineSearch className="w-4 h-4" />}
                placeholder="搜索"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <RefreshButton
                className="shrink-0"
                loading={notes.loading}
                onClick={notes.onReload}
              />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {filteredNotes?.map(({ id, name }) => (
                <AvailableNoteItem
                  key={id}
                  name={name}
                  onAdd={() => handleAddItem({ type: 'note', id })}
                />
              ))}
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
}

interface PreviewFormModalProps {
  visible: boolean;
  onHide: () => void;
  items?: TicketFormItem[];
}

function PreviewFormModal({ visible, onHide, items }: PreviewFormModalProps) {
  const methods = useForm();

  return (
    <Modal
      title="预览表单"
      visible={visible}
      onCancel={onHide}
      footer={false}
      bodyStyle={{ maxHeight: 'calc(100vh - 255px)', overflow: 'auto' }}
    >
      <FormProvider {...methods}>
        <Form className={ticketFormStyle.ticketForm} layout="vertical">
          {items && <FormItems items={items} />}
        </Form>
      </FormProvider>
    </Modal>
  );
}

export interface TicketFormData {
  title: string;
  items: {
    type: 'field' | 'note';
    id: string;
  }[];
}

export interface EditTicketFormProps {
  data?: Partial<TicketFormData>;
  submitting?: boolean;
  onSubmit: (data: TicketFormData) => void;
  onCancel?: () => void;
}

export function EditTicketForm({ data, submitting, onSubmit, onCancel }: EditTicketFormProps) {
  const { control, handleSubmit, getValues, reset } = useForm<TicketFormData>();
  useEffect(() => reset(data), [data]);

  const $antForm = useRef<FormInstance>(null!);

  const [inPreview, setInPreview] = useState(false);

  const fields = useTicketFields({
    pageSize: 1000,
    includeVariants: true,
    queryOptions: {
      staleTime: 1000 * 60,
    },
  });

  const notes = useTicketFormNotesWithDetail({
    pageSize: 1000,
    queryOptions: {
      staleTime: 1000 * 60,
    },
  });

  const fieldById = useMemo(() => keyBy(fields.data, (field) => field.id), [fields.data]);
  const noteById = useMemo(() => keyBy(notes.data?.data, (note) => note.id), [notes.data?.data]);

  const [currentItems, setCurrentItems] = useState<TicketFormItem[]>([]);

  const handlePreview = () => {
    const items = getValues('items');
    const currentItems: TicketFormItem[] = [];
    items.forEach((item) => {
      if (item.type === 'field') {
        const field = fieldById[item.id];
        if (field) {
          const defaultVariant = field.variants!.find((v) => v.locale === field.defaultLocale);
          currentItems.push({
            type: 'field',
            data: {
              ...field,
              title: defaultVariant!.title,
              description: defaultVariant!.description,
              options: defaultVariant!.options,
            },
          });
        }
      } else if (item.type === 'note') {
        const note = noteById[item.id];
        if (note) {
          currentItems.push({
            type: 'note',
            data: note,
          });
        }
      }
    });
    setCurrentItems(currentItems);
    setInPreview(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="grow p-10 overflow-y-auto">
        <Form ref={$antForm} layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <Controller
            control={control}
            name="title"
            rules={{ required: '请填写此字段' }}
            defaultValue=""
            render={({ field, fieldState: { error } }) => (
              <Form.Item
                label="表单名称"
                htmlFor="formName"
                validateStatus={error ? 'error' : undefined}
                help={error?.message}
                style={{ marginBottom: 16 }}
              >
                <Input {...field} id="formName" autoFocus />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="items"
            defaultValue={[]}
            rules={{ validate }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <FormItemsBuilder
                fields={{
                  data: fields.data,
                  loading: fields.isRefetching,
                  onReload: fields.refetch,
                }}
                notes={{
                  data: notes.data?.data,
                  loading: notes.isRefetching,
                  onReload: notes.refetch,
                }}
                value={value}
                error={error?.message}
                onChange={onChange}
              />
            )}
          />
        </Form>
      </div>

      <PreviewFormModal
        visible={inPreview}
        onHide={() => setInPreview(false)}
        items={currentItems}
      />

      <div className="flex px-10 py-4 border-t border-[#D8DCDE]">
        <Button onClick={handlePreview}>预览</Button>
        <div className="grow" />
        <Button className="mr-4" disabled={submitting} type="link" onClick={onCancel}>
          取消
        </Button>
        <Button type="primary" loading={submitting} onClick={() => $antForm.current.submit()}>
          保存
        </Button>
      </div>
    </div>
  );
}

function validate(items: TicketFormData['items']) {
  if (items.length === 0 || items.findIndex((item) => item.type === 'field') < 0) {
    return '请添加至少一个字段';
  }
}
