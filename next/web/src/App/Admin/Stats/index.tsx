import { Navigate, Route, Routes } from 'react-router-dom';
import { SubMenu } from '@/components/Page';
import { MenuDataItem } from '@/components/Page/SubMenu';
import { StatusPage } from './StatusPage';
import StatsPage from './StatsPage';

const menus: MenuDataItem[] = [
  {
    name: '工单统计',
    path: 'ticket',
    key: 'stats',
  },
  {
    name: '工单状态',
    path: 'ticket-status',
    key: 'status',
  },
];

export default function Stats() {
  return (
    <SubMenu menus={menus}>
      <Routes>
        <Route index element={<Navigate to="ticket" replace />} />
        <Route path="ticket" element={<StatsPage />} />
        <Route path="ticket-status" element={<StatusPage />} />
      </Routes>
    </SubMenu>
  );
}
