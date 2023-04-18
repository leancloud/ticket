import { ReactNode } from 'react';
import { Layout } from '@/components/antd';
import { MenuDataItem } from '.';
import BaseMenu from './BaseMenu';

const { Sider } = Layout;

interface SiderMenuProps {
  menus: MenuDataItem[];
  footer?: ReactNode;
}

export function SiderMenu({ menus, footer }: SiderMenuProps) {
  return (
    <Sider width={200} theme="light" className="p-5 overflow-auto">
      <BaseMenu data={menus} />
      {footer && <div className="w-full">{footer}</div>}
    </Sider>
  );
}
