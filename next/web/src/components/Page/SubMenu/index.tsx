import { useState } from 'react';
import { Layout } from '@/components/antd';
import { SiderMenu } from './SiderMenu';
export type MenuDataItem = {
  children?: MenuDataItem[];
  name?: React.ReactNode;
  path?: string;
  key?: string;
};

const SubMenu: React.FunctionComponent<{
  menus: MenuDataItem[];
}> = ({ children, menus }) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  return (
    <Layout
      className="h-full "
      style={{
        backgroundColor: '#FFF',
      }}
    >
      <SiderMenu menus={menus} collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout.Content className="h-full relative overflow-auto p-4">{children}</Layout.Content>
    </Layout>
  );
};

export { SubMenu };
