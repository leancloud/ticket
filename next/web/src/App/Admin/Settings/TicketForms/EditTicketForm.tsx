import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { AiOutlinePlus, AiOutlineSearch } from 'react-icons/ai';
import { BsX } from 'react-icons/bs';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import cx from 'classnames';
import { compact, keyBy } from 'lodash-es';

import { TicketFieldSchema, useTicketFields } from '@/api/ticket-field';
import { Button, Form, FormInstance, Input, Modal } from '@/components/antd';
import DragIcon from '@/icons/DragIcon';
import { CustomFields, CustomFieldsProps } from '@/App/Tickets/New/TicketForm/CustomFields';
import ticketFormStyle from '@/App/Tickets/New/TicketForm/index.module.css';
import { TicketFieldIcon } from '../TicketFields';

interface SelectedFieldItemProps {
  index: number;
  id: string;
  type: TicketFieldSchema['type'];
  title: string;
  active: boolean;
  system?: boolean;
  onRemove?: () => void;
}

function SelectedFieldItem({
  index,
  id,
  type,
  title,
  active,
  system,
  onRemove,
}: SelectedFieldItemProps) {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cx(
            'relative h-16 flex bg-white border border-[#c2c8cc] rounded shadow transition-shadow select-none mb-2',
            {
              'bg-gray-100': !active,
            }
          )}
        >
          <div {...provided.dragHandleProps} className="w-8 h-full cursor-grab flex shrink-0">
            <DragIcon className="w-4 h-4 m-auto" />
          </div>

          <div className="w-8 h-full flex shrink-0">
            {type && <TicketFieldIcon className="w-5 h-5 m-auto" type={type} />}
          </div>

          <div className="ml-3 h-full grow flex flex-col justify-center items-start overflow-hidden">
            <div
              className="text-[16px] leading-[16px] text-[#49545c] font-bold truncate"
              title={title}
            >
              {title ?? id}
            </div>
            {system && <div className="text-sm text-[#87929d] leading-3 mt-1">系统字段</div>}
            {!active && <div className="text-sm text-[#87929d] leading-3 mt-1">未激活</div>}
          </div>

          {!system && (
            <button
              className="absolute right-0 top-0 text-[#87929d]"
              type="button"
              onClick={onRemove}
            >
              <BsX className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}

interface AvailableFieldItemProps {
  type: TicketFieldSchema['type'];
  title: string;
  onAdd?: () => void;
}

function AvailableFieldItem({ type, title, onAdd }: AvailableFieldItemProps) {
  return (
    <div className="h-8 flex border border-[#d8dcde] rounded cursor-default bg-white select-none">
      <div className="w-8 h-8 shrink-0 p-2">
        <TicketFieldIcon className="w-full h-full" type={type} />
      </div>
      <div className="leading-8 text-sm grow truncate" title={title}>
        {title}
      </div>
      <button className="w-8 shrink-0" type="button" onClick={onAdd}>
        <AiOutlinePlus className="m-auto" />
      </button>
    </div>
  );
}

interface SelectedFieldSchema {
  id: string;
  type: TicketFieldSchema['type'];
  title: string;
  active: boolean;
  system?: true;
}

export const systemFields: SelectedFieldSchema[] = [
  {
    id: 'title',
    type: 'text',
    title: '标题',
    active: true,
    system: true,
  },
  {
    id: 'description',
    type: 'multi-line',
    title: '描述',
    active: true,
    system: true,
  },
];

interface FieldsBuilderProps {
  fields?: TicketFieldSchema[];
  value?: string[];
  onChange: (ids: string[]) => void;
}

function FieldsBuilder({ fields, value, onChange }: FieldsBuilderProps) {
  const fieldMap = useMemo(() => {
    const map: Record<string, SelectedFieldSchema | undefined> = {};
    fields?.forEach((f) => (map[f.id] = f));
    systemFields.forEach((f) => (map[f.id] = f));
    return map;
  }, [fields]);

  const activeFields = useMemo(() => fields?.filter((f) => f.active), [fields]);

  const availableFields = useMemo(() => {
    if (activeFields && value) {
      return activeFields.filter((f) => !value.includes(f.id));
    }
  }, [activeFields, value]);

  const [keyword, setKeyword] = useState('');
  const filteredFields = useMemo(() => {
    return availableFields?.filter((f) => f.title.includes(keyword));
  }, [availableFields, keyword]);

  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (destination && source.index !== destination.index) {
      const newList = value!.slice();
      newList.splice(destination.index, 0, newList.splice(source.index, 1)[0]);
      onChange(newList);
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
              {value?.map((id, index) => {
                const field = fieldMap[id];
                if (!field) {
                  return null;
                }

                return (
                  <SelectedFieldItem
                    {...field}
                    key={id}
                    index={index}
                    onRemove={() => onChange(value.filter((_id) => _id !== id))}
                  />
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="min-h-[500px] col-span-4 p-5 border border-[#d8dcde] rounded bg-gray-50">
        <div className="text-lg font-bold">可用工单字段</div>
        <div className="text-gray-400 mb-3">从此处新增字段至工单表单</div>
        <Input
          prefix={<AiOutlineSearch className="w-4 h-4" />}
          placeholder="搜索工单字段"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <div className="mt-4 flex flex-col gap-2">
          {filteredFields?.map(({ id, type, title }) => (
            <AvailableFieldItem
              key={id}
              type={type}
              title={title}
              onAdd={() => onChange(value ? [...value, id] : [id])}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface PreviewFormModalProps {
  visible: boolean;
  onHide: () => void;
  fields?: CustomFieldsProps['fields'];
}

function PreviewFormModal({ visible, onHide, fields }: PreviewFormModalProps) {
  const methods = useForm();

  return (
    <Modal title="预览表单" visible={visible} onCancel={onHide} footer={false}>
      <FormProvider {...methods}>
        <Form className={ticketFormStyle.ticketForm} layout="vertical">
          {fields && <CustomFields fields={fields} />}
        </Form>
      </FormProvider>
    </Modal>
  );
}

export interface TicketFormData {
  title: string;
  fieldIds: string[];
}

export interface EditTicketFormProps {
  initData?: TicketFormData;
  submitting?: boolean;
  onSubmit: (data: TicketFormData) => void;
  onCancel?: () => void;
}

export function EditTicketForm({ initData, submitting, onSubmit, onCancel }: EditTicketFormProps) {
  const { control, handleSubmit, getValues } = useForm<TicketFormData>({ defaultValues: initData });

  const $antForm = useRef<FormInstance>(null!);

  const [inPreview, setInPreview] = useState(false);

  const { data: fields } = useTicketFields({
    pageSize: 1000,
    orderBy: 'updatedAt-desc',
    includeVariants: true,
    queryOptions: {
      staleTime: 1000 * 60,
    },
  });

  const fieldById = useMemo(() => keyBy(fields, 'id'), [fields]);

  const [currentFields, setCurrentFields] = useState<PreviewFormModalProps['fields']>([]);
  const handlePreview = useCallback(() => {
    const fieldIds = getValues('fieldIds');
    const currentFields = compact(fieldIds.map((id) => fieldById[id]));
    setCurrentFields(
      currentFields.map((field) => {
        const defaultVariant = field.variants!.find((v) => v.locale === field.defaultLocale);
        return {
          ...field,
          title: defaultVariant!.title,
          description: defaultVariant!.description,
          options: defaultVariant!.options,
        };
      })
    );
    setInPreview(true);
  }, [getValues, fieldById]);

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
            name="fieldIds"
            defaultValue={[]}
            render={({ field: { value, onChange } }) => (
              <FieldsBuilder fields={fields} value={value} onChange={onChange} />
            )}
          />
        </Form>
      </div>

      <PreviewFormModal
        visible={inPreview}
        onHide={() => setInPreview(false)}
        fields={currentFields}
      />

      <div className="flex px-10 py-4 border-t border-[#D8DCDE]">
        <div className="grow">
          <Button onClick={handlePreview}>预览</Button>
        </div>
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
