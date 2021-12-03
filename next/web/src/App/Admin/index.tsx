import { Navigate, Route, Routes } from 'react-router-dom';

import { useCategories } from '@/api/category';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import Tickets from './Tickets';
import Setting from './Setting';

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
      <div className="flex flex-grow flex-col overflow-hidden">
        <Topbar className="flex-shrink-0" />
        <div className="flex-grow overflow-hidden">
          <Routes>
            <Route path="/tickets/*" element={<Tickets />} />
            <Route path="/setting/*" element={<Setting />} />
            <Route path="*" element={<Navigate to="tickets" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
