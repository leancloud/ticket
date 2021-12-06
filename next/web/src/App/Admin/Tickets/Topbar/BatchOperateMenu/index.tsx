import { Fragment } from 'react';
import { Menu as HLMenu, Transition } from '@headlessui/react';
import cx from 'classnames';

import Menu from '@/components/Menu';
import { Operation } from '../batchUpdate';

export interface BatchOperationMenuProps {
  className?: string;
  trigger: JSX.Element;
  onOperate: (op: Operation) => void;
}

export function BatchOperationMenu({ className, trigger, onOperate }: BatchOperationMenuProps) {
  return (
    <HLMenu as="span" className={cx('relative', className)}>
      <HLMenu.Button as={Fragment}>{trigger}</HLMenu.Button>

      <Transition
        enter="transition"
        enterFrom="opacity-0 -translate-y-4"
        leave="transition"
        leaveTo="opacity-0"
      >
        <HLMenu.Items
          as={Menu}
          className="absolute mt-1 border border-gray-300 rounded shadow-md"
          onSelect={onOperate as any}
        >
          <HLMenu.Item as={Menu.Item} eventKey="close">
            关闭
          </HLMenu.Item>
        </HLMenu.Items>
      </Transition>
    </HLMenu>
  );
}
