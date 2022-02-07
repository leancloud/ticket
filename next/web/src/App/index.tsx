import { ReactNode, Suspense, lazy, createContext, useContext, useState } from 'react';
import { QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { noop } from 'lodash-es';

import { CurrentUser, getCurrentUser } from '@/leancloud';
import { queryClient } from '@/api/query-client';
import { SearchParamsProvider } from '@/utils/useSearchParams';
import { Spin } from '@/components/antd';

const Tickets = lazy(() => import('./Tickets'));
const Admin = lazy(() => import('./Admin'));
const Login = lazy(() => import('./Login'));

export interface IAppContext {
  currentUser?: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
}

const AppContext = createContext<IAppContext>({
  setCurrentUser: noop,
});

function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);

function RequireAuth({ children }: { children: JSX.Element }) {
  const { currentUser } = useAppContext();
  if (!currentUser) {
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
            <AppProvider>
              <AppRoutes />
            </AppProvider>
          </SearchParamsProvider>
        </BrowserRouter>
      </RecoilRoot>
    </QueryClientProvider>
  );
}
