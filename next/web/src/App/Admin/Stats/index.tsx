import { SubMenu } from '@/components/Page';
import { Route, Routes } from 'react-router-dom';
import { MenuDataItem } from '@/components/Page/SubMenu';
import { StatusPage } from './StatusPage';
import StatsPage from './StatsPage';

const menus: MenuDataItem[] = [
  {
    name: '工单统计',
    path: './',
    key: 'stats',
  },
  {
    name: '工单状态',
    path: './status',
    key: 'status',
  },
];

export default function Stats() {
  return (
    <SubMenu menus={menus}>
      <Routes>
        <Route path="/status" element={<StatusPage />} />
        <Route path="/" element={<StatsPage />} />
      </Routes>
    </SubMenu>
  );
}
