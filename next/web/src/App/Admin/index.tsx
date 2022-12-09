import { Navigate, Route, Routes } from 'react-router-dom';

import { useCategories } from '@/api/category';
import { Sidebar } from './Sidebar';
import Tickets from './Tickets';
import { Views, ViewTickets } from './Views';
import { SearchTicket } from './Search';
import Settings from './Settings';
import Stats from './Stats';
import { NewTicket } from '../Tickets/New';
import { CategoryProvider } from '@/components/common';

export default function AdminPage() {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return <>Loading...</>;
  }
  return (
    <CategoryProvider categories={categories}>
      <div className="h-full grid grid-cols-[64px_1fr] bg-[#ebeff3]">
        <Sidebar className="z-40" />
        <div className="flex grow flex-col overflow-hidden">
          <div className="grow overflow-hidden h-full">
            <Routes>
              <Route
                path="/tickets/new"
                element={
                  <div className="h-full overflow-auto bg-white px-8 py-2">
                    <NewTicket />
                  </div>
                }
              />
              <Route path="/tickets/*" element={<Tickets />} />
              <Route path="/views" element={<Views />}>
                <Route index element={null} />
                <Route path=":id" element={<ViewTickets />} />
              </Route>
              <Route path="/search" element={<SearchTicket />} />
              <Route path="/settings/*" element={<Settings />} />
              <Route path="/stats/*" element={<Stats />} />
              <Route path="*" element={<Navigate to="tickets" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </CategoryProvider>
  );
}
