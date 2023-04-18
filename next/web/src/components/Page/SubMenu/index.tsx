import { ReactNode } from 'react';
import { Layout } from '@/components/antd';
import { SiderMenu } from './SiderMenu';
import './index.less';

export type MenuDataItem = {
  name: ReactNode;
  path?: string;
  key?: string;
  children?: MenuDataItem[];
};

interface SubMenuProps {
  menus: MenuDataItem[];
  footer?: ReactNode;
  children?: ReactNode;
}

export function SubMenu({ children, ...props }: SubMenuProps) {
  return (
    <Layout className="h-full" style={{ backgroundColor: '#FFF' }}>
      <SiderMenu {...props} />
      <Layout.Content className="h-full relative overflow-auto">{children}</Layout.Content>
    </Layout>
  );
}
