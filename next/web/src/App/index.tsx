import { QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { auth } from '@/leancloud';
import { queryClient } from '@/api/query-client';
import { SearchParamsProvicer } from '@/utils/useSearchParams';
import Tickets from './Tickets';
import Admin from './Admin';
import Login from './Login';

function RequireAuth({ children }: { children: JSX.Element }) {
  if (!auth.currentUser) {
    return <Navigate to="/login" />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/tickets/*" element={<RequireAuth children={<Tickets />} />} />
      <Route path="/admin/*" element={<RequireAuth children={<Admin />} />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <BrowserRouter basename="/next">
          <SearchParamsProvicer>
            <AppRoutes />
          </SearchParamsProvicer>
        </BrowserRouter>
      </RecoilRoot>
    </QueryClientProvider>
  );
}
