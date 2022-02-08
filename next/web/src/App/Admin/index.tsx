import { Navigate, Route, Routes } from 'react-router-dom';

import { useCategories } from '@/api/category';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import Tickets from './Tickets';
import { Views, ViewTickets } from './Views';
import { SearchTicket } from './Search';
import Settings from './Settings';

export default function AdminPage() {
  const { isLoading } = useCategories({
    queryOptions: {
      cacheTime: Infinity,
    },
  });
  if (isLoading) {
    return <>Loading...</>;
  }
  return (
    <div className="flex h-full bg-[#ebeff3]">
      <Sidebar className="z-40" />
      <div className="flex grow flex-col overflow-hidden">
        <Topbar className="shrink-0" />
        <div className="grow overflow-hidden">
          <Routes>
            <Route path="/tickets/*" element={<Tickets />} />
            <Route path="/views" element={<Views />}>
              <Route index element={null} />
              <Route path=":id" element={<ViewTickets />} />
            </Route>
            <Route path="/search" element={<SearchTicket />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="*" element={<Navigate to="tickets" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
