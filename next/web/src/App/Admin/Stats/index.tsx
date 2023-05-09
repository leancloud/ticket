import { Navigate, Route, Routes } from 'react-router-dom';
import { SubMenu } from '@/components/Page';
import { MenuDataItem } from '@/components/Page/SubMenu';
import { StatusPage } from './StatusPage';
import StatsPage from './StatsPage';
import { DurationStatistics } from './Duration';

const menus: MenuDataItem[] = [
  {
    name: '工单统计',
    path: 'ticket',
  },
  {
    name: '工单状态',
    path: 'ticket-status',
  },
  {
    name: '时长统计',
    path: 'duration',
  },
];

export default function Stats() {
  return (
    <SubMenu menus={menus}>
      <Routes>
        <Route index element={<Navigate to="ticket" replace />} />
        <Route path="ticket" element={<StatsPage />} />
        <Route path="ticket-status" element={<StatusPage />} />
        <Route path="duration" element={<DurationStatistics />} />
      </Routes>
    </SubMenu>
  );
}
