import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Modal, Select } from 'antd';
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import { differenceBy } from 'lodash-es';

import { SortableList } from '@/components/SortableList';
import { useTicketFields } from '@/api/ticket-field';

const NORMAL_TICKET_FIELDS = [
  {
    id: 'status',
    title: '状态',
  },
  {
    id: 'title',
    title: '标题',
  },
  {
    id: 'category',
    title: '分类',
  },
  {
    id: 'group',
    title: '客服组',
  },
  {
    id: 'assignee',
    title: '负责客服',
  },
  {
    id: 'author',
    title: '用户',
  },
  {
    id: 'language',
    title: '工单语言',
  },
  {
    id: 'createdAt',
    title: '创建时间',
  },
];

interface TicketTableColumnsHandle {
  getColumns: () => string[];
}

interface TicketTableColumnsProps {
  columns?: string[];
}

const TicketTableColumns = forwardRef<TicketTableColumnsHandle, TicketTableColumnsProps>(
  ({ columns }, ref) => {
    const [tempColumns, setTempColumns] = useState(() => (columns || []).map((id) => ({ id })));

    useImperativeHandle(ref, () => ({
      getColumns: () => tempColumns.map((col) => col.id),
    }));

    const { data: customFields } = useTicketFields({
      pageSize: 1000,
      queryOptions: {
        staleTime: 1000 * 60 * 5,
      },
    });

    const columnTitleById = useMemo(() => {
      const map: Record<string, string> = {};
      NORMAL_TICKET_FIELDS.forEach((field) => (map[field.id] = field.title));
      customFields?.forEach((field) => (map[field.id] = field.title));
      return map;
    }, [customFields]);

    const [addMode, setAddMode] = useState<string>();

    const availableNormalFields = useMemo(() => {
      return differenceBy(NORMAL_TICKET_FIELDS, tempColumns, (t) => t.id);
    }, [tempColumns]);

    const availableCustomFields = useMemo(() => {
      return differenceBy(customFields, tempColumns, (t) => t.id);
    }, [customFields, tempColumns]);

    const handleAddColumn = (id: string) => {
      setTempColumns((columns) => [...columns, { id }]);
      setAddMode(undefined);
    };

    const handleRemoveColumn = (id: string) => {
      setTempColumns((columns) => columns.filter((col) => col.id !== id));
    };

    return (
      <div>
        <ul className="flex flex-col gap-2">
          <SortableList
            items={tempColumns}
            onChange={setTempColumns}
            render={({ item, container, activator }) => (
              <li
                {...container}
                className="flex items-center gap-2 border rounded px-4 py-2 bg-white"
              >
                <button {...activator} className="text-[#999]">
                  <AiOutlineMenu className="w-4 h-4" />
                </button>
                {columnTitleById[item.id] || '未知'}
                <button className="ml-auto" onClick={() => handleRemoveColumn(item.id)}>
                  <AiOutlineClose className="w-4 h-4" />
                </button>
              </li>
            )}
          />
        </ul>

        {addMode !== undefined && (
          <div className="mb-4">
            <Select
              className="w-full"
              placeholder={addMode === 'normal' ? '选择内置字段' : '选择自定义字段'}
              options={addMode === 'normal' ? availableNormalFields : availableCustomFields}
              fieldNames={{ label: 'title', value: 'id' }}
              showSearch
              optionFilterProp="title"
              onSelect={handleAddColumn}
            />
          </div>
        )}

        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'normal',
                label: '内置字段',
                disabled: availableNormalFields.length === 0,
              },
              {
                key: 'custom',
                label: '自定义字段',
                disabled: availableCustomFields.length === 0,
              },
            ],
            onClick: (item) => setAddMode(item.key),
          }}
        >
          <Button>添加</Button>
        </Dropdown>
      </div>
    );
  }
);

export interface TicketTableColumnsModalProps {
  open?: boolean;
  onCancel?: () => void;
  columns?: string[];
  onChangeColumns?: (columns: string[]) => void;
}

export function TicketTableColumnsModal({
  open,
  onCancel,
  columns,
  onChangeColumns,
}: TicketTableColumnsModalProps) {
  const columnsHandle = useRef<TicketTableColumnsHandle>(null!);

  const handleOk = () => {
    if (onChangeColumns) {
      onChangeColumns(columnsHandle.current.getColumns());
    }
    onCancel?.();
  };

  return (
    <Modal destroyOnClose open={open} onCancel={onCancel} title="展示字段" onOk={handleOk}>
      <TicketTableColumns ref={columnsHandle} columns={columns} />
    </Modal>
  );
}
