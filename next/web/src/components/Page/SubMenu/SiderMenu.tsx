import React from 'react';
import { Layout } from '@/components/antd';
import { MenuDataItem } from '.';
import BaseMenu from './BaseMenu';
const { Sider } = Layout;

const SIDER_MENU_MAX = 200;
const SIDER_MENU_MIN = 64;

interface Props {
  menus: MenuDataItem[];
  collapsed?: boolean;
  onCollapse?: (value: boolean) => void;
}
export const SiderMenu: React.FunctionComponent<Props> = ({ menus, collapsed, onCollapse }) => {
  return (
    <Sider
      collapsible
      trigger={null}
      collapsed={collapsed}
      breakpoint="lg"
      collapsedWidth={SIDER_MENU_MIN}
      width={SIDER_MENU_MAX}
      theme="light"
    >
      <BaseMenu data={menus} />
    </Sider>
  );
};
