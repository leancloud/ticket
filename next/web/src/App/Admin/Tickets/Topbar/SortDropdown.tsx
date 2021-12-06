import { useCallback } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { HiChevronDown } from 'react-icons/hi';

import { useOrderBy as _useOrderBy } from '@/utils/useOrderBy';
import _Menu from '@/components/Menu';

const orderKeys: Record<string, string> = {
  createdAt: '创建日期',
  updatedAt: '最后修改时间',
  status: '状态',
};

export function useOrderBy() {
  return _useOrderBy({
    defaultOrderKey: 'createdAt',
    defaultOrderType: 'desc',
  });
}

export function SortDropdown({ disabled }: { disabled?: boolean }) {
  const { orderKey, orderType, setOrderKey, setOrderType } = useOrderBy();

  const handleSelect = useCallback(
    (eventKey: string) => {
      if (eventKey === 'asc' || eventKey === 'desc') {
        setOrderType(eventKey);
      } else {
        setOrderKey(eventKey);
      }
    },
    [setOrderKey, setOrderType]
  );

  return (
    <Menu as="span" className="relative">
      <Menu.Button disabled={disabled}>
        <span className="text-[#6f7c87]">排序方式:</span>
        <span className="ml-2 text-[13px] font-medium">
          {orderKeys[orderKey]} <HiChevronDown className="inline relative top-0.5" />
        </span>
      </Menu.Button>

      <Transition
        enter="transition"
        enterFrom="opacity-0 -translate-y-4"
        leave="transition"
        leaveTo="opacity-0"
      >
        <Menu.Items
          as={_Menu}
          className="absolute mt-1 border border-gray-300 rounded shadow-md"
          onSelect={handleSelect}
        >
          <Menu.Item as={_Menu.Item} eventKey="createdAt" active={orderKey === 'createdAt'}>
            {orderKeys.createdAt}
          </Menu.Item>
          <Menu.Item as={_Menu.Item} eventKey="updatedAt" active={orderKey === 'updatedAt'}>
            {orderKeys.updatedAt}
          </Menu.Item>
          <Menu.Item as={_Menu.Item} eventKey="status" active={orderKey === 'status'}>
            {orderKeys.status}
          </Menu.Item>
          <_Menu.Divider />
          <Menu.Item as={_Menu.Item} eventKey="asc" active={orderType === 'asc'}>
            升序
          </Menu.Item>
          <Menu.Item as={_Menu.Item} eventKey="desc" active={orderType === 'desc'}>
            降序
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
