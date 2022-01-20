import { Suspense, lazy } from 'react';
import { QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { auth } from '@/leancloud';
import { queryClient } from '@/api/query-client';
import { SearchParamsProvider } from '@/utils/useSearchParams';
import { Spin } from '@/components/antd';

const Tickets = lazy(() => import('./Tickets'));
const Admin = lazy(() => import('./Admin'));
const Login = lazy(() => import('./Login'));

function RequireAuth({ children }: { children: JSX.Element }) {
  if (!auth.currentUser) {
    return <Navigate to="/login" />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-full">
          <Spin />
        </div>
      }
    >
      <Routes>
        <Route path="/tickets/*" element={<RequireAuth children={<Tickets />} />} />
        <Route path="/admin/*" element={<RequireAuth children={<Admin />} />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <BrowserRouter basename="/next">
          <SearchParamsProvider>
            <AppRoutes />
          </SearchParamsProvider>
        </BrowserRouter>
      </RecoilRoot>
    </QueryClientProvider>
  );
}
