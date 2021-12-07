import { Menu, Transition } from '@headlessui/react';
import { HiChevronDown } from 'react-icons/hi';

import { useOrderBy as _useOrderBy } from '@/utils/useOrderBy';
import _Menu from '@/components/Menu';

export type Layout = 'card' | 'table';

const title: Record<Layout, string> = {
  card: '卡片视图',
  table: '表格视图',
};

export interface LayoutDropdownProps {
  value: Layout;
  onChange: (value: Layout) => void;
}

export function LayoutDropdown({ value, onChange }: LayoutDropdownProps) {
  return (
    <Menu as="span" className="relative">
      <Menu.Button>
        <span className="text-[#6f7c87]">布局:</span>
        <span className="ml-2 text-[13px] font-medium">
          {title[value]} <HiChevronDown className="inline relative top-0.5" />
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
          onSelect={onChange as any}
        >
          <Menu.Item as={_Menu.Item} eventKey="card" active={value === 'card'}>
            {title['card']}
          </Menu.Item>
          <Menu.Item as={_Menu.Item} eventKey="table" active={value === 'table'}>
            {title['table']}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
