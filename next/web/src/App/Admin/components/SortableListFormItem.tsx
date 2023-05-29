import { Key, ReactNode, useEffect, useMemo, useState } from 'react';
import { AiOutlineMenu } from 'react-icons/ai';
import { useToggle } from 'react-use';
import { keyBy, compact } from 'lodash-es';

import { Button, Empty, Modal, Transfer } from '@/components/antd';
import { SortableList } from '@/components/SortableList';

interface SortableListFormItemProps<TKey extends Key, Item> {
  items?: Item[];
  itemKey: (item: Item) => TKey;
  renderListItem: (item: Item) => ReactNode;
  renderTransferItem: (item: Item) => string;
  value?: TKey[];
  onChange: (keys: TKey[]) => void;
  maxCount?: number;
  modalTitle: string;
  emptyElement?: ReactNode;
  readonly?: boolean;
  loading?: boolean;
}

export function SortableListFormItem<TKey extends Key, Item>({
  items,
  itemKey,
  renderListItem,
  renderTransferItem,
  value,
  onChange,
  maxCount,
  modalTitle,
  emptyElement,
  readonly,
  loading,
}: SortableListFormItemProps<TKey, Item>) {
  const itemByKey = useMemo(() => keyBy(items, itemKey), [items, itemKey]);

  const selectedItems = useMemo(() => {
    if (!value) {
      return [];
    }
    return compact(value.map((key) => itemByKey[key]));
  }, [itemByKey, value]);

  const [modalOpen, toggleModal] = useToggle(false);

  return (
    <div>
      {selectedItems.length > 0 && (
        <DragSortList
          items={selectedItems}
          itemKey={itemKey}
          render={renderListItem}
          onChange={(items) => onChange(items.map(itemKey))}
          readonly={readonly}
        />
      )}
      {!readonly && (
        <Button onClick={toggleModal} loading={loading}>
          编辑
        </Button>
      )}
      <TransferModal
        open={modalOpen}
        onClose={toggleModal}
        title={modalTitle}
        items={items}
        itemKey={itemKey}
        render={renderTransferItem}
        value={value}
        onChange={(ids) => {
          if (maxCount && maxCount > 0) {
            onChange(ids.slice(0, maxCount));
          } else {
            onChange(ids);
          }
        }}
        emptyElement={emptyElement}
      />
    </div>
  );
}

interface DragSortListProps<Item> {
  items: Item[];
  itemKey?: (item: Item) => Key;
  render: (item: Item) => ReactNode;
  onChange: (items: Item[]) => void;
  readonly?: boolean;
}

export function DragSortList<Item>({
  items,
  itemKey,
  render,
  onChange,
  readonly,
}: DragSortListProps<Item>) {
  return (
    <ul className="mb-4 flex flex-col items-start gap-2 overflow-hidden">
      <SortableList
        items={items}
        itemKey={itemKey}
        onChange={onChange}
        render={({ item, container, activator }) => (
          <li {...container} className="flex items-center gap-2 max-w-full">
            {!readonly && (
              <span {...activator} className="text-[#999]">
                <AiOutlineMenu />
              </span>
            )}
            {render(item)}
          </li>
        )}
      />
    </ul>
  );
}

interface TransferModalProps<TKey extends Key, Item> {
  open: boolean;
  onClose: () => void;
  title: string;
  items?: Item[];
  itemKey: (item: Item) => TKey;
  render: (item: Item) => string;
  value?: TKey[];
  onChange: (keys: TKey[]) => void;
  emptyElement?: ReactNode;
}

export function TransferModal<TKey extends Key, Item>({
  open,
  onClose,
  title,
  items,
  itemKey,
  render,
  value,
  onChange,
  emptyElement,
}: TransferModalProps<TKey, Item>) {
  const itemsByKey = useMemo(() => keyBy(items, itemKey), [items, itemKey]);

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [targetKeys, setTargetKeys] = useState<string[]>([]);

  const reset = () => {
    if (value) {
      setTargetKeys(value.map((v) => v.toString()));
    } else {
      setTargetKeys([]);
    }
  };

  useEffect(reset, [value]);

  const noData = items && items.length === 0;

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={() => {
        onChange(targetKeys.map((key) => itemKey(itemsByKey[key])));
        onClose();
      }}
      afterClose={() => {
        reset();
        setSelectedKeys([]);
      }}
      width={600}
      bodyStyle={{
        maxHeight: 'max(250px, calc(100vh - 312px))',
        height: noData ? undefined : 600,
      }}
    >
      {noData ? (
        emptyElement || <Empty />
      ) : (
        <Transfer<any>
          showSearch
          dataSource={items}
          rowKey={(item) => itemKey(item).toString()}
          render={render}
          selectedKeys={selectedKeys}
          targetKeys={targetKeys}
          onSelectChange={(source, target) => setSelectedKeys(source.concat(target))}
          onChange={(targetKeys, direction, moveKeys) => {
            if (direction === 'right') {
              // 用拼接 moveKeys 的方式保证新添加的 key 总是在最下面
              setTargetKeys((prev) => [...prev, ...moveKeys]);
            } else {
              setTargetKeys(targetKeys);
            }
          }}
          listStyle={{ flexGrow: 1, height: '100%' }}
          style={{ height: '100%' }}
        />
      )}
    </Modal>
  );
}
