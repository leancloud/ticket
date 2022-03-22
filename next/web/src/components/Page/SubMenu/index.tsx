import React, { useState } from 'react';
import { Layout } from '@/components/antd';
import { SiderMenu } from './SiderMenu';
import './index.less'

export type MenuDataItem = {
  children?: MenuDataItem[];
  name: React.ReactNode;
  path?: string;
  key?: string;
};

const SubMenu: React.FunctionComponent<{
  menus: MenuDataItem[];
  footer?: React.ReactNode;
}> = ({ children, ...rest }) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  return (
    <Layout
      className="h-full "
      style={{
        backgroundColor: '#FFF',
      }}
    >
      <SiderMenu {...rest} collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout.Content className="h-full relative overflow-auto p-4">{children}</Layout.Content>
    </Layout>
  );
};

export { SubMenu };
