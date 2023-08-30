import { Suspense, lazy } from 'react';
import { QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import { parse, stringify } from 'query-string';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';

import { useCurrentUser } from '@/leancloud';
import { queryClient } from '@/api/query-client';
import { Spin } from '@/components/antd';

const Tickets = lazy(() => import('./Tickets'));
const Admin = lazy(() => import('./Admin'));
const Login = lazy(() => import('./Login'));

function RequireAuth({ children }: { children: JSX.Element }) {
  const currentUser = useCurrentUser();
  if (!currentUser) {
    window.location.href = '/login';
    return null;
  }
  return children;
}

function RequireEmbeddedAuth({ children }: { children: JSX.Element }) {
  const currentUser = useCurrentUser();
  if (!currentUser) {
    window.postMessage('requireAuth');
    return null;
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
        <Route path="/tickets/*" element={<RequireEmbeddedAuth children={<Tickets />} />} />
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
          <QueryParamProvider
            adapter={ReactRouter6Adapter}
            options={{
              searchStringToObject: parse,
              objectToSearchString: stringify,
            }}
          >
            <ConfigProvider locale={zhCN}>
              <AppRoutes />
            </ConfigProvider>
          </QueryParamProvider>
        </BrowserRouter>
      </RecoilRoot>
    </QueryClientProvider>
  );
}
